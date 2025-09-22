import type { PropsWithChildren } from "react";

import { CalendarEntryProvider } from "@/api/data/CalendarEntryProvider";

const providers = [CalendarEntryProvider];

export function DataProviders({ children }: PropsWithChildren) {
    return providers.reduceRight((acc, Provider) => <Provider>{acc}</Provider>, children);
}
