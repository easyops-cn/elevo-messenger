import React, { ReactNode } from 'react';
import { AuthDict, AuthType, IAuthData, UIAFlow } from 'matrix-js-sdk';
import { getUIAFlowForStages } from '../utils/matrix-uia';
import { useSupportedUIAFlows, useUIACompleted, useUIAFlow, type AuthStageData } from '../hooks/useUIAFlows';
import { UIAFlowOverlay } from './UIAFlowOverlay';
import { OAuthStage, PasswordStage, SSOStage } from './uia-stages';
import { useMatrixClient } from '../hooks/useMatrixClient';

const OAUTH_UIA_UNSTABLE_STAGE = 'org.matrix.cross_signing_reset';

const isOAuthUIAStage = (stageType: string): boolean =>
  stageType === AuthType.OAuth || stageType === OAUTH_UIA_UNSTABLE_STAGE;

const getUIAStageUrl = (stageData: AuthStageData): string | undefined => {
  const { info } = stageData;
  if (!info) return undefined;

  const { url } = info;
  return typeof url === 'string' ? url : undefined;
};

export const SUPPORTED_IN_APP_UIA_STAGES = [
  AuthType.Password,
  AuthType.Sso,
  AuthType.OAuth,
  OAUTH_UIA_UNSTABLE_STAGE,
];

export const pickUIAFlow = (uiaFlows: UIAFlow[]): UIAFlow | undefined => {
  const passwordFlow = getUIAFlowForStages(uiaFlows, [AuthType.Password]);
  if (passwordFlow) return passwordFlow;
  const oauthFlow =
    getUIAFlowForStages(uiaFlows, [AuthType.OAuth]) ??
    getUIAFlowForStages(uiaFlows, [OAUTH_UIA_UNSTABLE_STAGE]);
  if (oauthFlow) return oauthFlow;
  return getUIAFlowForStages(uiaFlows, [AuthType.Sso]);
};

type ActionUIAProps = {
  authData: IAuthData;
  ongoingFlow: UIAFlow;
  action: (authDict: AuthDict) => void;
  onCancel: () => void;
};
export function ActionUIA({ authData, ongoingFlow, action, onCancel }: ActionUIAProps) {
  const mx = useMatrixClient();
  const completed = useUIACompleted(authData);
  const { getStageToComplete } = useUIAFlow(authData, ongoingFlow);

  const stageToComplete = getStageToComplete();

  if (!stageToComplete) return null;
  
  return (
    <UIAFlowOverlay
      currentStep={completed.length + 1}
      stepCount={ongoingFlow.stages.length}
      onCancel={onCancel}
    >
      {stageToComplete.type === AuthType.Password && (
        <PasswordStage
          userId={mx.getSafeUserId()}
          stageData={stageToComplete}
          onCancel={onCancel}
          submitAuthDict={action}
        />
      )}
      {stageToComplete.type === AuthType.Sso && stageToComplete.session && (
        <SSOStage
          ssoRedirectURL={mx.getFallbackAuthUrl(AuthType.Sso, stageToComplete.session)}
          stageData={stageToComplete}
          onCancel={onCancel}
          submitAuthDict={action}
        />
      )}
      {isOAuthUIAStage(stageToComplete.type) && stageToComplete.session && (
        <OAuthStage
          approvalURL={getUIAStageUrl(stageToComplete)}
          stageData={stageToComplete}
          onCancel={onCancel}
          submitAuthDict={action}
        />
      )}
    </UIAFlowOverlay>
  );
}

type ActionUIAFlowsLoaderProps = {
  authData: IAuthData;
  unsupported: () => ReactNode;
  children: (ongoingFlow: UIAFlow) => ReactNode;
};
export function ActionUIAFlowsLoader({
  authData,
  unsupported,
  children,
}: ActionUIAFlowsLoaderProps) {
  const supportedFlows = useSupportedUIAFlows(authData.flows ?? [], SUPPORTED_IN_APP_UIA_STAGES);
  const ongoingFlow = supportedFlows.length > 0 ? supportedFlows[0] : undefined;

  if (!ongoingFlow) return unsupported();

  return children(ongoingFlow);
}
