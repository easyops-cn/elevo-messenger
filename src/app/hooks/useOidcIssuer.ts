import { createContext, useContext } from 'react';

const OidcIssuerContext = createContext<string | undefined>(undefined);

export const OidcIssuerProvider = OidcIssuerContext.Provider;

export const useOidcIssuer = (): string | undefined => useContext(OidcIssuerContext);
