import { AxiosError } from "axios";
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
import type {
    ApiData,
    CalendarEntryDto,
    CalendarEntryExtDto,
    ContextAction,
    Series,
} from "@/types";
import { startOfWeek } from "@/util/date";

enum CalendarEntryActions {
    GET_START = "GET_START",
    GET_SUCCESS = "GET_SUCCESS",
    POST_SUCCESS = "POST_SUCCESS",
    POST_SERIES_SUCCESS = "POST_SERIES_SUCCESS",
    DELETE_SUCCESS = "DELETE_SUCCESS",
    DELETE_SERIES_SUCCESS = "DELETE_SERIES_SUCCESS",
    QUERY_ERROR = "QUERY_ERROR",
    CLEAR_ERROR = "CLEAR_ERROR",
}

type CalendarEntryData = Record<number, CalendarEntryExtDto>;
type CalendarEntryState = ApiData<Record<string, CalendarEntryData>>;

function calendarEntryReducer(
    state: CalendarEntryState,
    action: ContextAction<
        [string, CalendarEntryData] | CalendarEntryExtDto | [string, CalendarEntryExtDto][],
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
            const data = action.payload as CalendarEntryExtDto;
            const date = action.params!.date as string;
            return {
                ...state,
                data: {
                    ...state.data,
                    [date]: { ...state.data[date], [data.Id]: data },
                },
                error: undefined,
            };
        }
        case CalendarEntryActions.POST_SERIES_SUCCESS: {
            if (state.data == null) {
                return state;
            }
            const data = action.payload as [string, CalendarEntryExtDto][];
            const newState = { ...state, error: undefined };

            data.forEach(([date, dto]) => {
                if (newState.data![date] != null) {
                    newState.data = {
                        ...newState.data,
                        [date]: { ...newState.data![date], [dto.Id]: dto },
                    };
                }
            });

            return newState;
        }
        case CalendarEntryActions.DELETE_SUCCESS: {
            if (state.data == null) {
                return state;
            }
            const { id, date } = action.params!;
            const newState = { ...state.data[date] };
            delete newState[id];
            return {
                ...state,
                data: { ...state.data, [date]: newState },
                error: undefined,
            };
        }
        case CalendarEntryActions.DELETE_SERIES_SUCCESS: {
            if (state.data == null) {
                return state;
            }
            const { id: seriesId } = action.params!;

            const newStateData = { ...state.data };
            Object.entries(state.data).forEach(([date, part]) => {
                newStateData[date] = Object.fromEntries(
                    Object.entries(part).filter(([, dto]) => dto.SeriesId != seriesId),
                );
            });

            return {
                ...state,
                data: newStateData,
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
    postCalendarEntry: (entry: CalendarEntryDto, date: string) => Promise<boolean>;
    postCalendarSeries: (entry: CalendarEntryDto, series: Series) => Promise<boolean>;
    deleteCalendarEntry: (id: number, email: string, date: string) => Promise<void>;
    deleteCalendarSeries: (id: number, email: string) => Promise<void>;
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
                    payload: mapDtoToExtDto(data),
                    params: { date },
                });
                showToast("success", t("calendar.context.success-postCalendarEntry"), 5000);
                return true;
            } catch (err) {
                dispatch({ type: CalendarEntryActions.QUERY_ERROR, error: err });
                if (err instanceof AxiosError && err.status === 409) {
                    showToast("error", t("calendar.context.error-postCalendarEntry-conflict"));
                } else {
                    showToast("error", t("calendar.context.error-postCalendarEntry"));
                }
                return false;
            }
        },
        [api, showToast, t],
    );

    const postCalendarSeries = useCallback(
        async (entry: CalendarEntryDto, series: Series) => {
            try {
                const data = await api
                    .post<CalendarEntryDto[]>("/calendar/series", { Entry: entry, Series: series })
                    .then((res) => res.data);
                dispatch({
                    type: CalendarEntryActions.POST_SERIES_SUCCESS,
                    payload: data.map((dto) => {
                        const extDto = mapDtoToExtDto(dto);
                        return [
                            startOfWeek(extDto.startDate).toISOString().split("T")[0],
                            extDto,
                        ] as [string, CalendarEntryExtDto];
                    }),
                });
                showToast("success", t("calendar.context.success-postCalendarSeries"), 5000);
                return true;
            } catch (err) {
                dispatch({ type: CalendarEntryActions.QUERY_ERROR, error: err });
                if (err instanceof AxiosError && err.status === 409) {
                    showToast("error", t("calendar.context.error-postCalendarSeries-conflict"));
                } else {
                    showToast("error", t("calendar.context.error-postCalendarSeries"));
                }
                return false;
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
                showToast("success", t("calendar.context.success-deleteCalendarEntry"), 5000);
            } catch (err) {
                dispatch({ type: CalendarEntryActions.QUERY_ERROR, error: err });
                showToast("error", t("calendar.context.error-deleteCalendarEntry"));
            }
        },
        [api, showToast, t],
    );

    const deleteCalendarSeries = useCallback(
        async (id: number, email: string) => {
            try {
                await api
                    .delete(`/calendar/series/${id}`, { params: { email } })
                    .then((res) => res.data);
                dispatch({
                    type: CalendarEntryActions.DELETE_SERIES_SUCCESS,
                    params: { id },
                });
                showToast("success", t("calendar.context.success-deleteCalendarSeries"), 5000);
            } catch (err) {
                dispatch({ type: CalendarEntryActions.QUERY_ERROR, error: err });
                showToast("error", t("calendar.context.error-deleteCalendarSeries"));
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
            postCalendarSeries,
            deleteCalendarEntry,
            deleteCalendarSeries,
            clearError,
        }),
        [
            state,
            getAllCalendarEntries,
            postCalendarEntry,
            postCalendarSeries,
            deleteCalendarEntry,
            deleteCalendarSeries,
            clearError,
        ],
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
    entry.slots = Math.ceil((entry.endDate.getTime() - entry.startDate.getTime()) / 3600000);
    return entry;
}
