// src/components/ui/PartnerTag.tsx
//
// Color-coded partner pill. Maps the 8 seeded partner codes to class names
// from globals.css. Unknown codes fall back to a neutral gray.

const TAG_CLASS: Record<string, string> = {
    HCL: "tag-hcl",
    COG: "tag-cog",
    LTM: "tag-ltm",
    TCS: "tag-tcs",
    WIP: "tag-wipro",
    HEX: "tag-hex",
    BIR: "tag-birla",
    MIN: "tag-minds",
};

export default function PartnerTag({
    code,
    label,
}: {
    code: string;
    label?: string;
}) {
    const cls = TAG_CLASS[code] ?? "tag-gray";
    return <span className={`partner-tag ${cls}`}>{label ?? code}</span>;
}
