export interface SystemTemplate {
    name: string;
    description: string;
}

export const systemTemplates: SystemTemplate[] = [
    {
        name: "Signage",
        description: "Exterior and interior signage systems including directional, ADA-compliant, and branding elements. Typically consists of metal, acrylic, or vinyl materials."
    },
    {
        name: "HVAC",
        description: "Heating, Ventilation, and Air Conditioning systems, including rooftop units, split systems, and ductwork. Focus on mechanical efficiency and age-related wear."
    },
    {
        name: "Roofing",
        description: "Building envelope protection including TPO, EPDM, or shingle systems. Assessment focuses on drainage, membrane integrity, and flashing condition."
    },
    {
        name: "Exterior Walls",
        description: "Building facade systems including brick veneer, EIFS, or metal panels. Focus on sealants, moisture penetration, and structural integrity."
    }
];

export function findSystemTemplate(input: string): string | null {
    const match = systemTemplates.find(t =>
        input.toLowerCase().includes(t.name.toLowerCase())
    );
    return match ? match.description : null;
}
