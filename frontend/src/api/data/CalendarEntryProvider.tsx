import {
    createContext,
    type PropsWithChildren,
    useCallback,
    useContext,
    useMemo,
    useReducer,
} from "react";
import { useTranslation } from "react-i18next";

import { useApi } from "@/api/ApiProvider";
import { useToast } from "@/components/Toast/ToastProvider";
import type { ApiData, CalendarEntryDto, CalendarEntryExtDto, ContextAction } from "@/types";

enum CalendarEntryActions {
    GET_START = "GET_START",
    GET_SUCCESS = "GET_SUCCESS",
    POST_SUCCESS = "POST_SUCCESS",
    DELETE_SUCCESS = "DELETE_SUCCESS",
    QUERY_ERROR = "QUERY_ERROR",
    CLEAR_ERROR = "CLEAR_ERROR",
}

type CalendarEntryData = Record<number, CalendarEntryExtDto>;
type CalendarEntryState = ApiData<Record<string, CalendarEntryData>>;

function calendarEntryReducer(
    state: CalendarEntryState,
    action: ContextAction<
        [string, CalendarEntryData] | [string, CalendarEntryExtDto],
        CalendarEntryActions
    >,
): CalendarEntryState {
    switch (action.type) {
        case CalendarEntryActions.GET_START:
            return { ...state, loading: true };
        case CalendarEntryActions.GET_SUCCESS: {
            const data = action.payload as [string, CalendarEntryData];
            return {
                ...state,
                loading: false,
                data: { ...(state.data ?? {}), [data[0]]: data[1] },
                error: undefined,
            };
        }
        case CalendarEntryActions.POST_SUCCESS: {
            if (state.data == null) {
                return state;
            }
            const data = action.payload as [string, CalendarEntryExtDto];
            return {
                ...state,
                data: {
                    ...state.data,
                    [data[0]]: { ...state.data[data[0]], [data[1].Id]: data[1] },
                },
                error: undefined,
            };
        }
        case CalendarEntryActions.DELETE_SUCCESS: {
            if (state.data == null) {
                return state;
            }
            const { id, date } = action.params!;
            return {
                ...state,
                data: { ...state.data, [date]: { ...state.data[date], [id]: undefined } },
                error: undefined,
            };
        }
        case CalendarEntryActions.QUERY_ERROR:
            return {
                ...state,
                loading: false,
                error: action.error,
            };
        case CalendarEntryActions.CLEAR_ERROR:
            return { ...state, error: undefined };
        default:
            return state;
    }
}

type CalendarEntryContextType = {
    state: CalendarEntryState;
    getAllCalendarEntries: (date: string) => Promise<void>;
    postCalendarEntry: (entry: CalendarEntryDto, date: string) => Promise<void>;
    deleteCalendarEntry: (id: number, email: string, date: string) => Promise<void>;
    clearError: () => void;
};

const CalendarEntryContext = createContext<CalendarEntryContextType | undefined>(undefined);

const initialState: CalendarEntryState = {
    data: undefined,
    loading: undefined,
    error: undefined,
};

export function CalendarEntryProvider({ children }: PropsWithChildren) {
    const [state, dispatch] = useReducer(calendarEntryReducer, initialState);
    const api = useApi();
    const { showToast } = useToast();
    const { t } = useTranslation();

    const getAllCalendarEntries = useCallback(
        async (date: string) => {
            dispatch({ type: CalendarEntryActions.GET_START });
            try {
                const data = await api
                    .get<CalendarEntryDto[]>("/calendar/entries", { params: { start: date } })
                    .then((res) => res.data);
                dispatch({
                    type: CalendarEntryActions.GET_SUCCESS,
                    payload: [
                        date,
                        Object.fromEntries(data.map((dto) => [dto.Id, mapDtoToExtDto(dto)])),
                    ],
                });
            } catch (err) {
                dispatch({ type: CalendarEntryActions.QUERY_ERROR, error: err });
                showToast("error", t("calendar.context.error-getAllCalendarEntries"));
            }
        },
        [api, showToast, t],
    );

    const postCalendarEntry = useCallback(
        async (entry: CalendarEntryDto, date: string) => {
            try {
                const data = await api
                    .post<CalendarEntryDto>("/calendar/entries", entry)
                    .then((res) => res.data);
                dispatch({
                    type: CalendarEntryActions.POST_SUCCESS,
                    payload: [date, mapDtoToExtDto(data)],
                });
                showToast("success", t("calendar.context.success-postCalendarEntry"), 5000);
            } catch (err) {
                dispatch({ type: CalendarEntryActions.QUERY_ERROR, error: err });
                showToast("error", t("calendar.context.error-postCalendarEntry"));
            }
        },
        [api, showToast, t],
    );

    const deleteCalendarEntry = useCallback(
        async (id: number, email: string, date: string) => {
            try {
                await api
                    .delete(`/calendar/entries/${id}`, { params: { email } })
                    .then((res) => res.data);
                dispatch({
                    type: CalendarEntryActions.DELETE_SUCCESS,
                    params: { id, date },
                });
            } catch (err) {
                dispatch({ type: CalendarEntryActions.QUERY_ERROR, error: err });
                showToast("error", t("calendar.context.error-deleteCalendarEntry"));
            }
        },
        [api, showToast, t],
    );

    const clearError = useCallback(() => dispatch({ type: CalendarEntryActions.CLEAR_ERROR }), []);

    const value = useMemo(
        () => ({
            state,
            getAllCalendarEntries,
            postCalendarEntry,
            deleteCalendarEntry,
            clearError,
        }),
        [clearError, getAllCalendarEntries, deleteCalendarEntry, postCalendarEntry, state],
    );

    return <CalendarEntryContext.Provider value={value}>{children}</CalendarEntryContext.Provider>;
}

export function useApiCalendarEntry() {
    const context = useContext(CalendarEntryContext);
    if (!context) {
        throw new Error("useApiCalendarEntry must be used within a CalendarEntryProvider");
    }
    return context;
}

function mapDtoToExtDto(dto: CalendarEntryDto): CalendarEntryExtDto {
    const entry = dto as CalendarEntryExtDto;
    const startDate = new Date(dto.Start);
    entry.startDate = new Date(startDate.getTime() + startDate.getTimezoneOffset() * 60 * 1000);
    const endDate = new Date(dto.End);
    entry.endDate = new Date(endDate.getTime() + endDate.getTimezoneOffset() * 60 * 1000);
    entry.slots = Math.floor((entry.endDate.getTime() - entry.startDate.getTime()) / 900000);
    return entry;
}
