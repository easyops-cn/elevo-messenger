import { Box, Button, color, config, Dialog, Header, Icon, IconButton, Icons, Text } from 'folds';
import React, { useCallback, useEffect, useState } from 'react';
import { StageComponentProps } from './types';

export function OAuthStage({
  approvalURL,
  stageData,
  submitAuthDict,
  onCancel,
}: StageComponentProps & {
  approvalURL?: string;
}) {
  const { errorCode, error, session } = stageData;
  const [oauthWindow, setOAuthWindow] = useState<Window | null>();

  const handleSubmit = useCallback(() => {
    submitAuthDict({
      session,
    });
  }, [submitAuthDict, session]);

  const handleOpenApproval = () => {
    if (!approvalURL) return;
    const newWindow = window.open(approvalURL, '_blank');
    setOAuthWindow(newWindow);
  };

  useEffect(() => {
    if (!approvalURL) return;
    const handleMessage = (evt: MessageEvent) => {
      if (
        evt.origin === new URL(approvalURL).origin &&
        oauthWindow &&
        evt.data === 'authDone' &&
        evt.source === oauthWindow
      ) {
        oauthWindow.close();
        setOAuthWindow(undefined);
        handleSubmit();
      }
    };

    window.addEventListener('message', handleMessage);
    return () => {
      window.removeEventListener('message', handleMessage);
    };
  }, [oauthWindow, handleSubmit, approvalURL]);

  return (
    <Dialog>
      <Header
        style={{
          padding: `0 ${config.space.S200} 0 ${config.space.S400}`,
        }}
        variant="Surface"
        size="500"
      >
        <Box grow="Yes">
          <Text size="H4">Approve Action</Text>
        </Box>
        <IconButton size="300" onClick={onCancel} radii="300">
          <Icon src={Icons.Cross} />
        </IconButton>
      </Header>
      <Box
        style={{ padding: `0 ${config.space.S400} ${config.space.S400}` }}
        direction="Column"
        gap="300"
      >
        <Text size="T200">
          To continue, approve this request in your account management page, then return and click
          retry.
        </Text>

        {errorCode && (
          <Box alignItems="Center" gap="100" style={{ color: color.Critical.Main }}>
            <Icon size="50" src={Icons.Warning} filled />
            <Text size="T200">
              <b>{`${errorCode}: ${error}`}</b>
            </Text>
          </Box>
        )}

        {approvalURL && (
          <Button variant="Primary" onClick={handleOpenApproval}>
            <Text as="span" size="B400">
              Open approval page
            </Text>
          </Button>
        )}

        <Button variant="Secondary" onClick={handleSubmit}>
          <Text as="span" size="B400">
            Retry
          </Text>
        </Button>
      </Box>
    </Dialog>
  );
}
