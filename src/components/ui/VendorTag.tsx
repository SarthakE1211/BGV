// src/components/ui/VendorTag.tsx

import type { BGVVendor } from "@/src/lib/enums";

export default function VendorTag({ vendor }: { vendor: BGVVendor }) {
    const isPH = vendor === "PRECISEHIRE";
    return (
        <span className={`vendor-tag ${isPH ? "vendor-precisehire" : ""}`}>
            {isPH ? "PreciseHire" : "DISA"}
        </span>
    );
}
