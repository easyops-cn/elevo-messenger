import React, {
  KeyboardEventHandler,
  RefObject,
  forwardRef,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';
import { useAtom, useAtomValue, useStore } from 'jotai';
import { isKeyHotkey } from 'is-hotkey';
import { EventType, IContent, MsgType, RelationType, Room } from 'matrix-js-sdk';
import type { RoomMessageEventContent } from 'matrix-js-sdk/lib/types';
import { ReactEditor } from 'slate-react';
import { Transforms, Editor } from 'slate';
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
  color,
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
import {
  SelectedFileReference,
  activateFileReference,
  activateTaskReference,
  clearInputReferenceActivity,
  clearInputReferences,
  roomIdToInputReferencesAtomFamily,
  setFileReference,
  setTaskReference,
  threadOrRoomIdToInputReferenceActivityAtomFamily,
  toggleFileReferenceActive,
  toggleTaskReferenceActive,
} from '../../state/room/roomInputReferences';
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
import { SHRUG, TABLEFLIP, UNFLIP, useCommands } from '../../hooks/useCommands';
import { mobileOrTablet } from '../../utils/user-agent';
import { ReplyLayout, ThreadIndicator } from '../../components/message';
import { roomToParentsAtom } from '../../state/room/roomToParents';
import { useMediaAuthentication } from '../../hooks/useMediaAuthentication';
import { useImagePackRooms } from '../../hooks/useImagePackRooms';
import { isComposing } from '../../hooks/useComposingCheck';
import { useSdkMessageListener, SdkMessagePayload } from '../../plugins/useTauriOpener';
import { useMediaConfig } from '../../hooks/useMediaConfig';
import { PlusIcon } from '../../icons/PlusIcon';
import { StickerIcon } from '../../icons/StickerIcon';
import { SmileIcon } from '../../icons/SmileIcon';
import { MicIcon } from '../../icons/MicIcon';
import { SendHorizontalIcon } from '../../icons/SendHorizontalIcon';
import { CaseSensitiveIcon } from '../../icons/CaseSensitiveIcon';
import { FileIcon } from '../../icons/FileIcon';
import { ListTodoIcon } from '../../icons/ListTodoIcon';
import { EyeOffIcon } from '../../icons/EyeOffIcon';
import { useRoomScrollToBottom } from './RoomScrollToBottomContext';
import { useRoomThread } from './RoomThreadContext';

interface WorkspaceExplorerMessage {
  type: 'select-file';
  file: null | SelectedFileReference;
}

interface TaskManagementMessage {
  type: 'select-task';
  task: null | {
    slug: string;
    title: string;
    status?: string;
  };
}

interface RoomInputProps {
  editor: Editor;
  fileDropContainerRef: RefObject<HTMLElement>;
  roomId: string;
  room: Room;
  enableSdkInputEvents?: boolean;
}
export const RoomInput = forwardRef<HTMLDivElement, RoomInputProps>(function LegacyRoomInput(
  { editor, fileDropContainerRef, roomId, room, enableSdkInputEvents = true },
  ref,
) {
  const thread = useRoomThread();
  const threadRootId = thread?.id;
  const { t } = useTranslation();
  const mx = useMatrixClient();
  const useAuthentication = useMediaAuthentication();
  const [enterForNewline] = useSetting(settingsAtom, 'enterForNewline');
  const [isMarkdown] = useSetting(settingsAtom, 'isMarkdown');
  const [hideActivity] = useSetting(settingsAtom, 'hideActivity');
  const commands = useCommands(mx, room);
  const emojiBtnRef = useRef<HTMLButtonElement>(null);
  const roomToParents = useAtomValue(roomToParentsAtom);
  const { emitScrollToBottomRequest } = useRoomScrollToBottom();

  const threadOrRoomId = threadRootId || roomId;
  const [msgDraft, setMsgDraft] = useAtom(threadOrRoomIdToMsgDraftAtomFamily(threadOrRoomId));
  const [replyDraft, setReplyDraft] = useAtom(threadOrRoomIdToReplyDraftAtomFamily(threadOrRoomId));

  const [uploadBoard, setUploadBoard] = useState(true);
  const [voiceRecordingOpen, setVoiceRecordingOpen] = useState(false);
  const [selectedFiles, setSelectedFiles] = useAtom(
    threadOrRoomIdToUploadItemsAtomFamily(threadOrRoomId),
  );
  const uploadFamilyObserverAtom = createUploadFamilyObserverAtom(
    roomUploadAtomFamily,
    selectedFiles.map((f) => f.file),
  );
  const uploadStore = useStore();
  const mediaConfig = useMediaConfig();
  const allowUploadSize = mediaConfig['m.upload.size'] || Infinity;
  const uploadBoardHandlers = useRef<UploadBoardImperativeHandlers>();
  const voiceRecordingRef = useRef<VoiceRecordingBoardHandlers>(null);
  const [shouldStartUpload, setShouldStartUpload] = useState(false);

  const imagePackRooms: Room[] = useImagePackRooms(roomId, roomToParents);

  const [toolbar, setToolbar] = useSetting(settingsAtom, 'editorToolbar');
  const [autocompleteQuery, setAutocompleteQuery] =
    useState<AutocompleteQuery<AutocompletePrefix>>();
  const [, setBeginCommand] = useState(() => getBeginCommand(editor));
  const [inputReferences, setInputReferences] = useAtom(roomIdToInputReferencesAtomFamily(roomId));
  const [inputReferenceActivity, setInputReferenceActivity] = useAtom(
    threadOrRoomIdToInputReferenceActivityAtomFamily(threadOrRoomId),
  );
  const [, setMainInputReferenceActivity] = useAtom(
    threadOrRoomIdToInputReferenceActivityAtomFamily(roomId),
  );
  const { fileReference: selectedFileRef, taskReference: selectedTaskRef } = inputReferences;
  const { fileReferenceActive: fileRefActive, taskReferenceActive: taskRefActive } =
    inputReferenceActivity;

  const sendTypingStatus = useTypingStatusUpdater(mx, roomId);

  const updateBeginCommand = useCallback(() => {
    setBeginCommand(getBeginCommand(editor));
  }, [editor]);

  const handleWorkspaceFileSelect = useCallback(
    (payload: SdkMessagePayload<WorkspaceExplorerMessage>) => {
      if (!enableSdkInputEvents) return;

      const { data } = payload;
      if (data?.type === 'select-file') {
        setInputReferences((references) => setFileReference(references, data.file));
        if (data.file) {
          setMainInputReferenceActivity((activity) => activateFileReference(activity));
          setInputReferenceActivity((activity) => activateFileReference(activity));
        }
      }
    },
    [
      enableSdkInputEvents,
      setInputReferences,
      setInputReferenceActivity,
      setMainInputReferenceActivity,
    ],
  );
  useSdkMessageListener<WorkspaceExplorerMessage>('workspace-explorer', handleWorkspaceFileSelect);

  const handleTaskSelect = useCallback(
    (payload: SdkMessagePayload<TaskManagementMessage>) => {
      if (!enableSdkInputEvents) return;

      const { data } = payload;
      if (data?.type === 'select-task') {
        setInputReferences((references) => setTaskReference(references, data.task));
        if (data.task) {
          setMainInputReferenceActivity((activity) => activateTaskReference(activity));
          setInputReferenceActivity((activity) => activateTaskReference(activity));
        }
      }
    },
    [
      enableSdkInputEvents,
      setInputReferences,
      setInputReferenceActivity,
      setMainInputReferenceActivity,
    ],
  );
  useSdkMessageListener<TaskManagementMessage>('tasks-management', handleTaskSelect);

  const handleFiles = useCallback(
    async (files: File[]) => {
      setUploadBoard(true);
      setShouldStartUpload(false);
      const safeFiles = files.map(safeFile);
      const fileItems: TUploadItem[] = [];

      if (room.hasEncryptionStateEvent()) {
        const encryptFiles = fulfilledPromiseSettledResult(
          await Promise.allSettled(safeFiles.map((f) => encryptFile(f))),
        );
        encryptFiles.forEach((ef) =>
          fileItems.push({
            ...ef,
            metadata: {
              markedAsSpoiler: false,
            },
          }),
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
          }),
        );
      }
      setSelectedFiles({
        type: 'PUT',
        item: fileItems,
      });
    },
    [setSelectedFiles, room],
  );
  const pickFile = useFilePicker(handleFiles, true);
  const handlePaste = useFilePasteHandler(handleFiles);
  const dropZoneVisible = useFileDropZone(fileDropContainerRef, handleFiles);
  const hideStickerBtn = !!threadRootId;

  useEffect(() => {
    Transforms.insertFragment(editor, msgDraft);
    updateBeginCommand();
  }, [editor, msgDraft, updateBeginCommand]);

  useEffect(() => {
    if (!replyDraft?.fork) return;

    const plainText = toPlainText(editor.children, isMarkdown).trimStart();
    if (/^\/fork\b/i.test(plainText)) return;

    ReactEditor.focus(editor);
    Transforms.select(editor, Editor.start(editor, []));
    Transforms.insertText(editor, '/fork ');
    Transforms.collapse(editor, { edge: 'end' });
    updateBeginCommand();
  }, [editor, replyDraft, isMarkdown, updateBeginCommand]);

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
    [roomId, editor, setMsgDraft],
  );

  const handleFileMetadata = useCallback(
    (fileItem: TUploadItem, metadata: TUploadMetadata) => {
      setSelectedFiles({
        type: 'REPLACE',
        item: fileItem,
        replacement: { ...fileItem, metadata },
      });
    },
    [setSelectedFiles],
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
    [setSelectedFiles, selectedFiles],
  );

  const handleCancelUpload = (uploads: Upload[]) => {
    uploads.forEach((upload) => {
      if (upload.status === UploadStatus.Loading) {
        mx.cancelUpload(upload.promise);
      }
    });
    handleRemoveUpload(uploads.map((upload) => upload.file));
  };

  const handleSendUpload = async () => {
    setShouldStartUpload(true);

    const waitForUploadsToSettle = () =>
      new Promise<Upload[]>((resolve) => {
        const interval = window.setInterval(poll, 120);

        function poll() {
          const uploads = uploadStore.get(uploadFamilyObserverAtom);
          const hasStartableIdleUploads = uploads.some(
            (upload) => upload.status === UploadStatus.Idle && upload.file.size < allowUploadSize,
          );
          const hasLoadingUploads = uploads.some(
            (upload) => upload.status === UploadStatus.Loading,
          );

          if (!hasStartableIdleUploads && !hasLoadingUploads) {
            window.clearInterval(interval);
            resolve(uploads);
          }
        }
      });

    try {
      const uploads = await waitForUploadsToSettle();

      const successfulUploads = uploads.filter(
        (upload): upload is UploadSuccess => upload.status === UploadStatus.Success,
      );
      if (successfulUploads.length === 0) {
        return;
      }

      const contentsPromises = successfulUploads.map(async (upload) => {
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
      const contents = fulfilledPromiseSettledResult(await Promise.allSettled(contentsPromises));
      contents.forEach((content) =>
        mx.sendMessage(roomId, threadRootId || null, content as RoomMessageEventContent),
      );
      handleRemoveUpload(successfulUploads.map((upload) => upload.file));
    } finally {
      setShouldStartUpload(false);
    }
  };

  const submit = useCallback(() => {
    uploadBoardHandlers.current?.handleSend();
    emitScrollToBottomRequest();

    const commandName = getBeginCommand(editor);
    let plainText = toPlainText(editor.children, isMarkdown).trim();
    let customHtml = trimCustomHtml(
      toMatrixCustomHTML(editor.children, {
        allowTextFormatting: true,
        allowBlockMarkdown: isMarkdown,
        allowInlineMarkdown: isMarkdown,
      }),
    );
    let msgType = MsgType.Text;

    if (commandName === 'me' && commands.me) {
      msgType = MsgType.Emote;
      plainText = trimCommand(commandName, plainText);
      customHtml = trimCommand(commandName, customHtml);
    } else if (commandName === 'notice' && commands.notice) {
      msgType = MsgType.Notice;
      plainText = trimCommand(commandName, plainText);
      customHtml = trimCommand(commandName, customHtml);
    } else if (commandName === 'shrug' && commands.shrug) {
      plainText = trimCommand(commandName, plainText);
      customHtml = trimCommand(commandName, customHtml);
      plainText = `${SHRUG} ${plainText}`;
      customHtml = `${SHRUG} ${customHtml}`;
    } else if (commandName === 'tableflip' && commands.tableflip) {
      plainText = trimCommand(commandName, plainText);
      customHtml = trimCommand(commandName, customHtml);
      plainText = `${TABLEFLIP} ${plainText}`;
      customHtml = `${TABLEFLIP} ${customHtml}`;
    } else if (commandName === 'unflip' && commands.unflip) {
      plainText = trimCommand(commandName, plainText);
      customHtml = trimCommand(commandName, customHtml);
      plainText = `${UNFLIP} ${plainText}`;
      customHtml = `${UNFLIP} ${customHtml}`;
    } else if (commandName) {
      const commandContent = commands[commandName];
      if (commandContent?.exe) {
        commandContent.exe(trimCommand(commandName, plainText));
        resetEditor(editor);
        resetEditorHistory(editor);
        sendTypingStatus(false);
        return;
      }
      // Custom command without exe or disabled command: keep /command prefix as plain text
    } else {
      // No command: use plain text as-is
    }

    const fileRef =
      fileRefActive && selectedFileRef
        ? {
            path: selectedFileRef.path,
            workspaceId: selectedFileRef.workspaceId,
            workspaceName: selectedFileRef.workspaceName,
          }
        : null;

    const taskRef =
      taskRefActive && selectedTaskRef
        ? {
            slug: selectedTaskRef.slug,
            title: selectedTaskRef.title,
            ...(selectedTaskRef.status ? { status: selectedTaskRef.status } : {}),
          }
        : null;

    if (plainText === '' && !fileRef && !taskRef) return;

    const body = plainText || selectedFileRef?.name || selectedTaskRef?.title || '';
    const isForkCommand = /^\/fork\b/i.test(body.trimStart());
    const formattedBody = customHtml || body;
    const mentionData = getMentions(mx, roomId, editor);

    const content: IContent = {
      msgtype: msgType,
      body,
    };

    if (fileRef) {
      content['vip.elevo.file_reference'] = fileRef;
    }

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
      if (isForkCommand) {
        content['m.relates_to'] = {
          // Use a custom relation to avoid thread fallback
          ['vip.elevo.forks_from' as 'm.in_reply_to']: {
            event_id: replyDraft.eventId,
          },
        };
      } else {
        content['m.relates_to'] = {
          'm.in_reply_to': {
            event_id: replyDraft.eventId,
          },
        };
        if (replyDraft?.relation?.rel_type === RelationType.Thread) {
          content['m.relates_to'].event_id = replyDraft.relation.event_id;
          content['m.relates_to'].rel_type = RelationType.Thread;
          content['m.relates_to'].is_falling_back =
            replyDraft.eventId === replyDraft.relation.event_id;
        }
      }
    }

    mx.sendMessage(
      roomId,
      isForkCommand ? null : threadRootId || null,
      content as RoomMessageEventContent,
    );
    resetEditor(editor);
    resetEditorHistory(editor);
    setInputReferences(clearInputReferences());
    setMainInputReferenceActivity(clearInputReferenceActivity());
    setInputReferenceActivity(clearInputReferenceActivity());
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
    selectedFileRef,
    fileRefActive,
    selectedTaskRef,
    taskRefActive,
    setInputReferences,
    setInputReferenceActivity,
    setMainInputReferenceActivity,
    emitScrollToBottomRequest,
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
    [submit, setReplyDraft, enterForNewline, autocompleteQuery],
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
      updateBeginCommand();
    },
    [editor, sendTypingStatus, hideActivity, updateBeginCommand],
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
      emitScrollToBottomRequest();
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
                      key={index}
                      isEncrypted={!!fileItem.encInfo}
                      shouldStartUpload={shouldStartUpload}
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
        onChange={updateBeginCommand}
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
                    {!threadRootId && replyDraft.relation?.rel_type === RelationType.Thread && (
                      <ThreadIndicator />
                    )}
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
                        : (emojiBtnRef.current?.getBoundingClientRect() ?? undefined)
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
                          hideStickerBtn ? !!emojiBoardTab : emojiBoardTab === EmojiBoardTab.Emoji
                        }
                      />
                    </IconButton>
                  </PopOut>
                )}
              </UseStateProvider>
              {selectedFileRef && (
                <>
                  <Line variant="Surface" direction="Vertical" style={{ height: toRem(12) }} />
                  <IconButton
                    variant="Surface"
                    size="300"
                    radii="300"
                    fill="None"
                    aria-label={selectedFileRef.name}
                    title={selectedFileRef.path}
                    onClick={() =>
                      setInputReferenceActivity((activity) => toggleFileReferenceActive(activity))
                    }
                    style={{
                      maxWidth: toRem(180),
                      gap: config.space.S100,
                      opacity: fileRefActive ? 1 : 0.35,
                      color: fileRefActive ? color.Primary.Main : undefined,
                    }}
                  >
                    <Icon
                      size="50"
                      src={fileRefActive ? FileIcon : EyeOffIcon}
                      filled={fileRefActive}
                    />
                    <Text size="T200" truncate>
                      {selectedFileRef.name}
                    </Text>
                  </IconButton>
                </>
              )}
              {selectedTaskRef && (
                <>
                  <Line variant="Surface" direction="Vertical" style={{ height: toRem(12) }} />
                  <IconButton
                    variant="Surface"
                    size="300"
                    radii="300"
                    fill="None"
                    aria-label={selectedTaskRef.title}
                    title={
                      selectedTaskRef.status
                        ? `${selectedTaskRef.title} (${selectedTaskRef.status})`
                        : selectedTaskRef.title
                    }
                    onClick={() =>
                      setInputReferenceActivity((activity) => toggleTaskReferenceActive(activity))
                    }
                    style={{
                      maxWidth: toRem(180),
                      gap: config.space.S100,
                      opacity: taskRefActive ? 1 : 0.35,
                      color: taskRefActive ? color.Primary.Main : undefined,
                    }}
                  >
                    <Icon
                      size="50"
                      src={taskRefActive ? ListTodoIcon : EyeOffIcon}
                      filled={taskRefActive}
                    />
                    <Text size="T200" truncate>
                      {selectedTaskRef.title}
                    </Text>
                  </IconButton>
                </>
              )}
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
              <IconButton onClick={submit} variant="Primary" size="300" radii="Pill" fill="Soft">
                <Icon size="100" src={SendHorizontalIcon} />
              </IconButton>
            </Box>
          </Box>
        }
      />
    </div>
  );
});
