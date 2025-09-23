import {
    createContext,
    type PropsWithChildren,
    useCallback,
    useContext,
    useMemo,
    useReducer,
} from "react";

import { createApi } from "@/api/ApiProvider";
import type { ApiData, ContextAction } from "@/types";
import { parseJwt } from "@/util/jwt";

enum AuthActions {
    START = "START",
    RESULT = "RESULT",
    ERROR = "ERROR",
}

type AuthData = { token: string; expiresAt: Date };
type AuthState = ApiData<AuthData>;

function authReducer(state: AuthState, action: ContextAction<AuthData, AuthActions>): AuthState {
    switch (action.type) {
        case AuthActions.START:
            return { ...state, loading: true };
        case AuthActions.RESULT:
            return {
                ...state,
                loading: false,
                data: action.payload,
                error: undefined,
            };
        case AuthActions.ERROR:
            return {
                ...state,
                loading: false,
                error: action.error,
            };
        default:
            return state;
    }
}

type AuthContextType = {
    state: AuthState;
    login: (username: string, password: string) => Promise<AuthData | undefined>;
    refresh: () => Promise<AuthData | undefined>;
    logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const initialState: AuthState = {
    data: (() => {
        const token = localStorage.getItem("pray_calendar-auth_token");
        if (token) {
            const jwt = parseJwt(token);
            return {
                token: token,
                expiresAt: new Date(jwt.payload.exp * 1000),
            };
        } else {
            return undefined;
        }
    })(),
    loading: undefined,
    error: undefined,
};

export function AuthProvider({ children }: PropsWithChildren) {
    const [state, dispatch] = useReducer(authReducer, initialState);

    // Auth needs its own, self-contained api in order to be usable outside the context (and inside the component) <ApiProvider>
    const api = useMemo(createApi, []);

    const login = useCallback(
        async (username: string, password: string) => {
            dispatch({ type: AuthActions.START });
            try {
                const rawData = await api
                    .post<string>("/admin/login", {
                        Username: username,
                        Password: password,
                    })
                    .then((res) => res.data);
                const jwt = parseJwt(rawData);
                const data = {
                    token: rawData,
                    expiresAt: new Date(jwt.payload.exp * 1000),
                };

                dispatch({ type: AuthActions.RESULT, payload: data });
                localStorage.setItem("pray_calendar-auth_token", rawData);

                return data;
            } catch (err) {
                dispatch({ type: AuthActions.ERROR, error: err });
            }
        },
        [api],
    );

    const refresh = useCallback(async () => {
        dispatch({ type: AuthActions.START });
        try {
            const rawData = await api.get<string>("/admin/token").then((res) => res.data);
            const jwt = parseJwt(rawData);
            const data = {
                token: rawData,
                expiresAt: new Date(jwt.payload.exp * 1000),
            };

            dispatch({ type: AuthActions.RESULT, payload: data });
            localStorage.setItem("pray_calendar-auth_token", rawData);

            return data;
        } catch (err) {
            dispatch({ type: AuthActions.ERROR, error: err });
        }
    }, [api]);

    const logout = useCallback(async () => {
        dispatch({ type: AuthActions.RESULT, payload: undefined });

        localStorage.removeItem("pray_calendar-auth_token");
    }, []);

    const value = useMemo(
        () => ({ state, login, refresh, logout }),
        [login, logout, refresh, state],
    );

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error("useAuth must be used within a AuthProvider");
    }
    return context;
}
