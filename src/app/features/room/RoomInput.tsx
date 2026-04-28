import React, {
  KeyboardEventHandler,
  RefObject,
  forwardRef,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';
import { useAtom, useAtomValue } from 'jotai';
import { isKeyHotkey } from 'is-hotkey';
import { EventType, IContent, MsgType, RelationType, Room } from 'matrix-js-sdk';
import type { RoomMessageEventContent } from 'matrix-js-sdk/lib/types';
import { ReactEditor } from 'slate-react';
import { Transforms, Editor, Element as SlateElement, Path, Node, Text as SlateText } from 'slate';
import {
  Box,
  Dialog,
  Icon,
  IconButton,
  Icons,
  Line,
  Overlay,
  OverlayBackdrop,
  OverlayCenter,
  PopOut,
  Scroll,
  Text,
  config,
  toRem,
} from 'folds';
import { useTranslation } from 'react-i18next';

import { useMatrixClient } from '../../hooks/useMatrixClient';
import {
  CustomEditor,
  Toolbar,
  toMatrixCustomHTML,
  toPlainText,
  AUTOCOMPLETE_PREFIXES,
  AutocompletePrefix,
  AutocompleteQuery,
  getAutocompleteQuery,
  getPrevWorldRange,
  resetEditor,
  RoomMentionAutocomplete,
  UserMentionAutocomplete,
  EmoticonAutocomplete,
  createEmoticonElement,
  moveCursor,
  resetEditorHistory,
  customHtmlEqualsPlainText,
  trimCustomHtml,
  isEmptyEditor,
  getBeginCommand,
  trimCommand,
  getMentions,
  getFileReference,
  createFileRefElement,
  getTaskReference,
  createTaskRefElement,
} from '../../components/editor';
import { EmojiBoard, EmojiBoardTab } from '../../components/emoji-board';
import { UseStateProvider } from '../../components/UseStateProvider';
import {
  TUploadContent,
  encryptFile,
  getImageInfo,
  getMxIdLocalPart,
  mxcUrlToHttp,
} from '../../utils/matrix';
import { useTypingStatusUpdater } from '../../hooks/useTypingStatusUpdater';
import { useFilePicker } from '../../hooks/useFilePicker';
import { useFilePasteHandler } from '../../hooks/useFilePasteHandler';
import { useFileDropZone } from '../../hooks/useFileDrop';
import {
  TUploadItem,
  TUploadMetadata,
  threadOrRoomIdToMsgDraftAtomFamily,
  threadOrRoomIdToReplyDraftAtomFamily,
  threadOrRoomIdToUploadItemsAtomFamily,
  roomUploadAtomFamily,
} from '../../state/room/roomInputDrafts';
import { UploadCardRenderer } from '../../components/upload-card';
import {
  UploadBoard,
  UploadBoardContent,
  UploadBoardHeader,
  UploadBoardImperativeHandlers,
} from '../../components/upload-board';
import {
  Upload,
  UploadStatus,
  UploadSuccess,
  createUploadFamilyObserverAtom,
} from '../../state/upload';
import { getImageUrlBlob, loadImageElement } from '../../utils/dom';
import { safeFile } from '../../utils/mimeTypes';
import { fulfilledPromiseSettledResult } from '../../utils/common';
import { useSetting } from '../../state/hooks/settings';
import { settingsAtom } from '../../state/settings';
import {
  getAudioMsgContent,
  getFileMsgContent,
  getImageMsgContent,
  getVideoMsgContent,
} from './msgContent';
import { getMemberDisplayName, getMentionContent, trimReplyFromBody } from '../../utils/room';
import { CommandAutocomplete } from './CommandAutocomplete';
import { VoiceRecordingBoard, VoiceRecordingBoardHandlers } from './VoiceRecordingBoard';
import { Command, SHRUG, TABLEFLIP, UNFLIP, useCommands } from '../../hooks/useCommands';
import { mobileOrTablet } from '../../utils/user-agent';
import { ReplyLayout, ThreadIndicator } from '../../components/message';
import { roomToParentsAtom } from '../../state/room/roomToParents';
import { useMediaAuthentication } from '../../hooks/useMediaAuthentication';
import { useImagePackRooms } from '../../hooks/useImagePackRooms';
import { useComposingCheck } from '../../hooks/useComposingCheck';
import { useSdkMessageListener, SdkMessagePayload } from '../../plugins/useTauriOpener';
import { PlusIcon } from '../../icons/PlusIcon';
import { StickerIcon } from '../../icons/StickerIcon';
import { SmileIcon } from '../../icons/SmileIcon';
import { MicIcon } from '../../icons/MicIcon';
import { SendHorizontalIcon } from '../../icons/SendHorizontalIcon';
import { CaseSensitiveIcon } from '../../icons/CaseSensitiveIcon';

interface WorkspaceExplorerMessage {
  type: 'select-file';
  file: null | {
    path: string;
    name: string;
    workspaceId: string;
    workspaceName: string;
  };
}

interface TaskManagementMessage {
  type: 'select-task';
  task: null | {
    id: string;
    workspace_id: string;
    title: string;
    status?: { category: 'todo' | 'in_progress' | 'done' | 'cancelled' };
  };
}

interface RoomInputProps {
  editor: Editor;
  fileDropContainerRef: RefObject<HTMLElement>;
  roomId: string;
  room: Room;
  threadRootId?: string;
  scrollToBottomRef?: React.MutableRefObject<(() => void) | null>;
}
export const RoomInput = forwardRef<HTMLDivElement, RoomInputProps>(
  ({ editor, fileDropContainerRef, roomId, room, threadRootId, scrollToBottomRef }, ref) => {
    const { t } = useTranslation();
    const mx = useMatrixClient();
    const useAuthentication = useMediaAuthentication();
    const [enterForNewline] = useSetting(settingsAtom, 'enterForNewline');
    const [isMarkdown] = useSetting(settingsAtom, 'isMarkdown');
    const [hideActivity] = useSetting(settingsAtom, 'hideActivity');
    const commands = useCommands(mx, room);
    const emojiBtnRef = useRef<HTMLButtonElement>(null);
    const roomToParents = useAtomValue(roomToParentsAtom);

    const threadOrRoomId = threadRootId || roomId;
    const [msgDraft, setMsgDraft] = useAtom(threadOrRoomIdToMsgDraftAtomFamily(threadOrRoomId));
    const [replyDraft, setReplyDraft] = useAtom(threadOrRoomIdToReplyDraftAtomFamily(threadOrRoomId));

    const [uploadBoard, setUploadBoard] = useState(true);
    const [voiceRecordingOpen, setVoiceRecordingOpen] = useState(false);
    const [selectedFiles, setSelectedFiles] = useAtom(threadOrRoomIdToUploadItemsAtomFamily(threadOrRoomId));
    const uploadFamilyObserverAtom = createUploadFamilyObserverAtom(
      roomUploadAtomFamily,
      selectedFiles.map((f) => f.file)
    );
    const uploadBoardHandlers = useRef<UploadBoardImperativeHandlers>();
    const voiceRecordingRef = useRef<VoiceRecordingBoardHandlers>(null);

    const imagePackRooms: Room[] = useImagePackRooms(roomId, roomToParents);

    const [toolbar, setToolbar] = useSetting(settingsAtom, 'editorToolbar');
    const [autocompleteQuery, setAutocompleteQuery] =
      useState<AutocompleteQuery<AutocompletePrefix>>();

    const sendTypingStatus = useTypingStatusUpdater(mx, roomId);

    const removeExistingFileRef = useCallback(() => {
      const [fileRefEntry] = Editor.nodes(editor, {
        at: [],
        match: (n) => SlateElement.isElement(n) && n.type === 'file-ref',
      });

      if (fileRefEntry) {
        const [, fileRefPath] = fileRefEntry;
        const nextPath = Path.next(fileRefPath);

        if (Node.has(editor, nextPath)) {
          const nextNode = Node.get(editor, nextPath);
          if (SlateText.isText(nextNode) && /^\s$/.test(nextNode.text)) {
            Transforms.removeNodes(editor, { at: nextPath });
          }
        }

        Transforms.removeNodes(editor, { at: fileRefPath });
      }
    }, [editor]);

    const handleWorkspaceFileSelect = useCallback(
      (payload: SdkMessagePayload<WorkspaceExplorerMessage>) => {
        const { data } = payload;
        if (data?.type === 'select-file') {
          removeExistingFileRef();
          if (data.file) {
            const element = createFileRefElement(
              data.file.path,
              data.file.name,
              data.file.workspaceId,
              data.file.workspaceName
            );
            ReactEditor.focus(editor);
            Transforms.select(editor, Editor.end(editor, []));
            Transforms.insertNodes(editor, element);
            Transforms.collapse(editor, { edge: 'end' });
            moveCursor(editor, true);
          }
        }
      },
      [editor, removeExistingFileRef]
    );
    useSdkMessageListener<WorkspaceExplorerMessage>(
      'workspace-explorer',
      handleWorkspaceFileSelect
    );

    const removeExistingTaskRef = useCallback(() => {
      const [taskRefEntry] = Editor.nodes(editor, {
        at: [],
        match: (n) => SlateElement.isElement(n) && n.type === 'task-ref',
      });

      if (taskRefEntry) {
        const [, taskRefPath] = taskRefEntry;
        const nextPath = Path.next(taskRefPath);

        if (Node.has(editor, nextPath)) {
          const nextNode = Node.get(editor, nextPath);
          if (SlateText.isText(nextNode) && /^\s$/.test(nextNode.text)) {
            Transforms.removeNodes(editor, { at: nextPath });
          }
        }

        Transforms.removeNodes(editor, { at: taskRefPath });
      }
    }, [editor]);

    const handleTaskSelect = useCallback(
      (payload: SdkMessagePayload<TaskManagementMessage>) => {
        const { data } = payload;
        if (data?.type === 'select-task') {
          removeExistingTaskRef();
          if (data.task) {
            const element = createTaskRefElement(
              data.task.id,
              data.task.workspace_id,
              data.task.title,
              data.task.status?.category
            );
            ReactEditor.focus(editor);
            Transforms.select(editor, Editor.end(editor, []));
            Transforms.insertNodes(editor, element);
            Transforms.collapse(editor, { edge: 'end' });
            moveCursor(editor, true);
          }
        }
      },
      [editor, removeExistingTaskRef]
    );
    useSdkMessageListener<TaskManagementMessage>('tasks-management', handleTaskSelect);

    const handleFiles = useCallback(
      async (files: File[]) => {
        setUploadBoard(true);
        const safeFiles = files.map(safeFile);
        const fileItems: TUploadItem[] = [];

        if (room.hasEncryptionStateEvent()) {
          const encryptFiles = fulfilledPromiseSettledResult(
            await Promise.allSettled(safeFiles.map((f) => encryptFile(f)))
          );
          encryptFiles.forEach((ef) =>
            fileItems.push({
              ...ef,
              metadata: {
                markedAsSpoiler: false,
              },
            })
          );
        } else {
          safeFiles.forEach((f) =>
            fileItems.push({
              file: f,
              originalFile: f,
              encInfo: undefined,
              metadata: {
                markedAsSpoiler: false,
              },
            })
          );
        }
        setSelectedFiles({
          type: 'PUT',
          item: fileItems,
        });
      },
      [setSelectedFiles, room]
    );
    const pickFile = useFilePicker(handleFiles, true);
    const handlePaste = useFilePasteHandler(handleFiles);
    const dropZoneVisible = useFileDropZone(fileDropContainerRef, handleFiles);
    const hideStickerBtn = !!threadRootId;

    const isComposing = useComposingCheck();

    useEffect(() => {
      Transforms.insertFragment(editor, msgDraft);
    }, [editor, msgDraft]);

    useEffect(
      () => () => {
        if (!isEmptyEditor(editor)) {
          const parsedDraft = JSON.parse(JSON.stringify(editor.children));
          setMsgDraft(parsedDraft);
        } else {
          setMsgDraft([]);
        }
        resetEditor(editor);
        resetEditorHistory(editor);
      },
      [roomId, editor, setMsgDraft]
    );

    const handleFileMetadata = useCallback(
      (fileItem: TUploadItem, metadata: TUploadMetadata) => {
        setSelectedFiles({
          type: 'REPLACE',
          item: fileItem,
          replacement: { ...fileItem, metadata },
        });
      },
      [setSelectedFiles]
    );

    const handleRemoveUpload = useCallback(
      (upload: TUploadContent | TUploadContent[]) => {
        const uploads = Array.isArray(upload) ? upload : [upload];
        setSelectedFiles({
          type: 'DELETE',
          item: selectedFiles.filter((f) => uploads.find((u) => u === f.file)),
        });
        uploads.forEach((u) => roomUploadAtomFamily.remove(u));
      },
      [setSelectedFiles, selectedFiles]
    );

    const handleCancelUpload = (uploads: Upload[]) => {
      uploads.forEach((upload) => {
        if (upload.status === UploadStatus.Loading) {
          mx.cancelUpload(upload.promise);
        }
      });
      handleRemoveUpload(uploads.map((upload) => upload.file));
    };

    const handleSendUpload = async (uploads: UploadSuccess[]) => {
      const contentsPromises = uploads.map(async (upload) => {
        const fileItem = selectedFiles.find((f) => f.file === upload.file);
        if (!fileItem) throw new Error('Broken upload');

        if (fileItem.file.type.startsWith('image')) {
          return getImageMsgContent(mx, fileItem, upload.mxc);
        }
        if (fileItem.file.type.startsWith('video')) {
          return getVideoMsgContent(mx, fileItem, upload.mxc);
        }
        if (fileItem.file.type.startsWith('audio')) {
          return getAudioMsgContent(fileItem, upload.mxc);
        }
        return getFileMsgContent(fileItem, upload.mxc);
      });
      handleCancelUpload(uploads);
      const contents = fulfilledPromiseSettledResult(await Promise.allSettled(contentsPromises));
      contents.forEach((content) => mx.sendMessage(roomId, threadRootId || null, content as RoomMessageEventContent));
    };

    const submit = useCallback(() => {
      uploadBoardHandlers.current?.handleSend();
      scrollToBottomRef?.current?.();

      const commandName = getBeginCommand(editor);
      let plainText = toPlainText(editor.children, isMarkdown).trim();
      let customHtml = trimCustomHtml(
        toMatrixCustomHTML(editor.children, {
          allowTextFormatting: true,
          allowBlockMarkdown: isMarkdown,
          allowInlineMarkdown: isMarkdown,
        })
      );
      let msgType = MsgType.Text;

      if (commandName) {
        plainText = trimCommand(commandName, plainText);
        customHtml = trimCommand(commandName, customHtml);
      }
      if (commandName === Command.Me) {
        msgType = MsgType.Emote;
      } else if (commandName === Command.Notice) {
        msgType = MsgType.Notice;
      } else if (commandName === Command.Shrug) {
        plainText = `${SHRUG} ${plainText}`;
        customHtml = `${SHRUG} ${customHtml}`;
      } else if (commandName === Command.TableFlip) {
        plainText = `${TABLEFLIP} ${plainText}`;
        customHtml = `${TABLEFLIP} ${customHtml}`;
      } else if (commandName === Command.UnFlip) {
        plainText = `${UNFLIP} ${plainText}`;
        customHtml = `${UNFLIP} ${customHtml}`;
      } else if (commandName) {
        const commandContent = commands[commandName as Command];
        if (commandContent) {
          commandContent.exe(plainText);
        }
        resetEditor(editor);
        resetEditorHistory(editor);
        sendTypingStatus(false);
        return;
      }

      if (plainText === '') return;

      const body = plainText;
      const formattedBody = customHtml;
      const mentionData = getMentions(mx, roomId, editor);
      const fileRef = getFileReference(editor);

      const content: IContent = {
        msgtype: msgType,
        body,
      };

      if (fileRef) {
        content['vip.elevo.file_reference'] = fileRef;
      }

      const taskRef = getTaskReference(editor);
      if (taskRef) {
        content['vip.elevo.task_reference'] = taskRef;
      }

      if (replyDraft && replyDraft.userId !== mx.getUserId()) {
        mentionData.users.add(replyDraft.userId);
      }

      const mMentions = getMentionContent(Array.from(mentionData.users), mentionData.room);
      content['m.mentions'] = mMentions;

      if (replyDraft || !customHtmlEqualsPlainText(formattedBody, body)) {
        content.format = 'org.matrix.custom.html';
        content.formatted_body = formattedBody;
      }
      if (replyDraft) {
        content['m.relates_to'] = {
          'm.in_reply_to': {
            event_id: replyDraft.eventId,
          },
        };
        if (replyDraft?.relation?.rel_type === RelationType.Thread) {
          content['m.relates_to'].event_id = replyDraft.relation.event_id;
          content['m.relates_to'].rel_type = RelationType.Thread;
          content['m.relates_to'].is_falling_back = true;
        }
      }

      mx.sendMessage(roomId, threadRootId || null, content as RoomMessageEventContent);
      resetEditor(editor);
      resetEditorHistory(editor);
      setReplyDraft(undefined);
      sendTypingStatus(false);
    }, [
      mx,
      roomId,
      threadRootId,
      editor,
      replyDraft,
      sendTypingStatus,
      setReplyDraft,
      isMarkdown,
      commands,
      scrollToBottomRef,
    ]);

    const handleKeyDown: KeyboardEventHandler = useCallback(
      (evt) => {
        if (isKeyHotkey('mod+enter', evt) || (!enterForNewline && isKeyHotkey('enter', evt))) {
          if (isComposing(evt)) {
            // IME confirming keydown (Safari): block Slate's default newline insertion
            evt.preventDefault();
            return;
          }
          evt.preventDefault();
          submit();
        }
        if (isKeyHotkey('escape', evt)) {
          evt.preventDefault();
          if (autocompleteQuery) {
            setAutocompleteQuery(undefined);
            return;
          }
          setReplyDraft(undefined);
        }
      },
      [submit, setReplyDraft, enterForNewline, autocompleteQuery, isComposing]
    );

    const handleKeyUp: KeyboardEventHandler = useCallback(
      (evt) => {
        if (isKeyHotkey('escape', evt)) {
          evt.preventDefault();
          return;
        }

        if (!hideActivity) {
          sendTypingStatus(!isEmptyEditor(editor));
        }

        const prevWordRange = getPrevWorldRange(editor);
        const query = prevWordRange
          ? getAutocompleteQuery<AutocompletePrefix>(editor, prevWordRange, AUTOCOMPLETE_PREFIXES)
          : undefined;
        setAutocompleteQuery(query);
      },
      [editor, sendTypingStatus, hideActivity]
    );

    const handleCloseAutocomplete = useCallback(() => {
      setAutocompleteQuery(undefined);
      ReactEditor.focus(editor);
    }, [editor]);

    const handleEmoticonSelect = (key: string, shortcode: string) => {
      editor.insertNode(createEmoticonElement(key, shortcode));
      moveCursor(editor);
    };

    const handleStickerSelect = async (mxc: string, shortcode: string, label: string) => {
      const stickerUrl = mxcUrlToHttp(mx, mxc, useAuthentication);
      if (!stickerUrl) return;

      const blob = await getImageUrlBlob(stickerUrl);
      const blobUrl = URL.createObjectURL(blob);
      try {
        const info = await getImageInfo(await loadImageElement(blobUrl), blob);

        mx.sendEvent(roomId, EventType.Sticker, {
          body: label,
          url: mxc,
          info,
        });
        scrollToBottomRef?.current?.();
      } finally {
        URL.revokeObjectURL(blobUrl);
      }
    };

    return (
      <div ref={ref}>
        {voiceRecordingOpen && (
          <VoiceRecordingBoard
            ref={voiceRecordingRef}
            roomId={roomId}
            room={room}
            onClose={() => setVoiceRecordingOpen(false)}
          />
        )}
        {selectedFiles.length > 0 && (
          <UploadBoard
            header={
              <UploadBoardHeader
                open={uploadBoard}
                onToggle={() => setUploadBoard(!uploadBoard)}
                uploadFamilyObserverAtom={uploadFamilyObserverAtom}
                onSend={handleSendUpload}
                imperativeHandlerRef={uploadBoardHandlers}
                onCancel={handleCancelUpload}
              />
            }
          >
            {uploadBoard && (
              <Scroll size="300" hideTrack visibility="Hover">
                <UploadBoardContent>
                  {Array.from(selectedFiles)
                    .reverse()
                    .map((fileItem, index) => (
                      <UploadCardRenderer
                        // eslint-disable-next-line react/no-array-index-key
                        key={index}
                        isEncrypted={!!fileItem.encInfo}
                        fileItem={fileItem}
                        setMetadata={handleFileMetadata}
                        onRemove={handleRemoveUpload}
                      />
                    ))}
                </UploadBoardContent>
              </Scroll>
            )}
          </UploadBoard>
        )}
        <Overlay
          open={dropZoneVisible}
          backdrop={<OverlayBackdrop />}
          style={{ pointerEvents: 'none' }}
        >
          <OverlayCenter>
            <Dialog variant="Primary">
              <Box
                direction="Column"
                justifyContent="Center"
                alignItems="Center"
                gap="500"
                style={{ padding: toRem(60) }}
              >
                <Icon size="600" src={Icons.File} />
                <Text size="H4" align="Center">
                  {t('room.dropFiles', { roomName: room?.name || 'Room' })}
                </Text>
                <Text align="Center">{t('room.dropFilesHint')}</Text>
              </Box>
            </Dialog>
          </OverlayCenter>
        </Overlay>
        {autocompleteQuery?.prefix === AutocompletePrefix.RoomMention && (
          <RoomMentionAutocomplete
            roomId={roomId}
            editor={editor}
            query={autocompleteQuery}
            requestClose={handleCloseAutocomplete}
          />
        )}
        {autocompleteQuery?.prefix === AutocompletePrefix.UserMention && (
          <UserMentionAutocomplete
            room={room}
            editor={editor}
            query={autocompleteQuery}
            requestClose={handleCloseAutocomplete}
          />
        )}
        {autocompleteQuery?.prefix === AutocompletePrefix.Emoticon && (
          <EmoticonAutocomplete
            imagePackRooms={imagePackRooms}
            editor={editor}
            query={autocompleteQuery}
            requestClose={handleCloseAutocomplete}
          />
        )}
        {autocompleteQuery?.prefix === AutocompletePrefix.Command && (
          <CommandAutocomplete
            room={room}
            editor={editor}
            query={autocompleteQuery}
            requestClose={handleCloseAutocomplete}
          />
        )}
        <CustomEditor
          editableName="RoomInput"
          editor={editor}
          placeholder={t('room.sendMessage')}
          onKeyDown={handleKeyDown}
          onKeyUp={handleKeyUp}
          onPaste={handlePaste}
          top={
            <>
              {toolbar && (
                <div>
                  <Toolbar />
                  <Line variant="Surface" size="300" />
                </div>
              )}
              {replyDraft && (
              <div>
                <Box
                  alignItems="Center"
                  gap="300"
                  style={{ padding: `${config.space.S200} ${config.space.S300} 0` }}
                >
                  <IconButton
                    onClick={() => setReplyDraft(undefined)}
                    variant="Surface"
                    size="300"
                    radii="Pill"
                    fill="None"
                  >
                    <Icon src={Icons.Cross} size="50" />
                  </IconButton>
                  <Box direction="Row" gap="200" alignItems="Center">
                    {!threadRootId && replyDraft.relation?.rel_type === RelationType.Thread && <ThreadIndicator />}
                    <ReplyLayout
                      username={
                        getMemberDisplayName(room, replyDraft.userId) ??
                        getMxIdLocalPart(replyDraft.userId) ??
                        replyDraft.userId
                      }
                    >
                      <Text size="T300" truncate>
                        {trimReplyFromBody(replyDraft.body)}
                      </Text>
                    </ReplyLayout>
                  </Box>
                </Box>
              </div>
            )}
            </>
          }
          bottom={
            <Box
              alignItems="Center"
              justifyContent="SpaceBetween"
              gap="100"
              shrink="No"
              style={{
                padding: `0 ${config.space.S200} ${config.space.S200}`,
              }}
            >
              <Box alignItems="Center" gap="100">
                <IconButton
                  onClick={() => pickFile('*')}
                  variant="Surface"
                  size="300"
                  radii="Pill"
                  fill="None"
                >
                  <Icon size="100" src={PlusIcon} />
                </IconButton>
                <IconButton
                  variant="Surface"
                  size="300"
                  radii="Pill"
                  fill="None"
                  aria-pressed={toolbar}
                  onClick={() => setToolbar(!toolbar)}
                >
                  <Icon size="100" src={CaseSensitiveIcon} />
                </IconButton>
                <UseStateProvider initial={undefined}>
                  {(emojiBoardTab: EmojiBoardTab | undefined, setEmojiBoardTab) => (
                    <PopOut
                      offset={16}
                      alignOffset={-44}
                      position="Top"
                      align="End"
                      anchor={
                        emojiBoardTab === undefined
                          ? undefined
                          : emojiBtnRef.current?.getBoundingClientRect() ?? undefined
                      }
                      content={
                        <EmojiBoard
                          tab={emojiBoardTab}
                          allowSticker={!hideStickerBtn}
                          onTabChange={setEmojiBoardTab}
                          imagePackRooms={imagePackRooms}
                          returnFocusOnDeactivate={false}
                          onEmojiSelect={handleEmoticonSelect}
                          onCustomEmojiSelect={handleEmoticonSelect}
                          onStickerSelect={handleStickerSelect}
                          requestClose={() => {
                            setEmojiBoardTab((tab) => {
                              if (tab) {
                                if (!mobileOrTablet()) ReactEditor.focus(editor);
                                return undefined;
                              }
                              return tab;
                            });
                          }}
                        />
                      }
                    >
                      {!hideStickerBtn && (
                        <IconButton
                          aria-pressed={emojiBoardTab === EmojiBoardTab.Sticker}
                          onClick={() => setEmojiBoardTab(EmojiBoardTab.Sticker)}
                          variant="Surface"
                          size="300"
                          radii="Pill"
                          fill="None"
                        >
                          <Icon
                            size="100"
                            src={StickerIcon}
                            filled={emojiBoardTab === EmojiBoardTab.Sticker}
                          />
                        </IconButton>
                      )}
                      <IconButton
                        ref={emojiBtnRef}
                        aria-pressed={
                          hideStickerBtn ? !!emojiBoardTab : emojiBoardTab === EmojiBoardTab.Emoji
                        }
                        onClick={() => setEmojiBoardTab(EmojiBoardTab.Emoji)}
                        variant="Surface"
                        size="300"
                        radii="Pill"
                        fill="None"
                      >
                        <Icon
                          size="100"
                          src={SmileIcon}
                          filled={
                            hideStickerBtn
                              ? !!emojiBoardTab
                              : emojiBoardTab === EmojiBoardTab.Emoji
                          }
                        />
                      </IconButton>
                    </PopOut>
                  )}
                </UseStateProvider>
              </Box>
              <Box alignItems="Center" gap="100">
                <IconButton
                  variant="Surface"
                  size="300"
                  radii="Pill"
                  fill="None"
                  aria-pressed={voiceRecordingOpen}
                  aria-label="Record voice message"
                  onClick={() => {
                    if (voiceRecordingOpen) {
                      const stopped = voiceRecordingRef.current?.stopRecording();
                      if (!stopped) {
                        setVoiceRecordingOpen(false);
                      }
                    } else {
                      setVoiceRecordingOpen(true);
                    }
                  }}
                >
                  <Icon size="100" src={MicIcon} filled={voiceRecordingOpen} />
                </IconButton>
                <IconButton
                  onClick={submit}
                  variant="Primary"
                  size="300"
                  radii="Pill"
                  fill="Soft"
                >
                  <Icon size="100" src={SendHorizontalIcon} />
                </IconButton>
              </Box>
            </Box>
          }
        />
      </div>
    );
  }
);
