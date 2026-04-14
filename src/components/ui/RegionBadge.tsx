// src/components/ui/RegionBadge.tsx

import type { Region } from "@/src/lib/enums";

const REGION_CLASS: Record<Region, string> = {
    USA:    "",
    CANADA: "region-canada",
    LATAM:  "region-latam",
};

const REGION_LABEL: Record<Region, string> = {
    USA:    "USA",
    CANADA: "Canada",
    LATAM:  "LATAM",
};

export default function RegionBadge({ region }: { region: Region }) {
    return (
        <span className={`region-badge ${REGION_CLASS[region]}`.trim()}>
            {REGION_LABEL[region]}
        </span>
    );
}
