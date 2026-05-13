export type DataBundle = {
  id: string;
  network: "mtn" | "telecel" | "airteltigo";
  name: string;
  price: number;
  volume: string;
  validity: string;
};

export const dataBundles: DataBundle[] = [
  { id: "mtn-1", network: "mtn", name: "1.5GB Daily", price: 1000, volume: "1.5GB", validity: "1 day" },
  { id: "mtn-7", network: "mtn", name: "10GB Weekly", price: 4500, volume: "10GB", validity: "7 days" },
  { id: "telecel-5", network: "telecel", name: "5GB Weekly", price: 2800, volume: "5GB", validity: "7 days" },
  { id: "telecel-15", network: "telecel", name: "15GB Monthly", price: 9800, volume: "15GB", validity: "30 days" },
  { id: "airteltigo-2", network: "airteltigo", name: "2GB Daily", price: 1200, volume: "2GB", validity: "1 day" },
  { id: "airteltigo-12", network: "airteltigo", name: "12GB Monthly", price: 7200, volume: "12GB", validity: "30 days" },
];

export function getBundleById(bundleId: string) {
  return dataBundles.find((bundle) => bundle.id === bundleId);
}
