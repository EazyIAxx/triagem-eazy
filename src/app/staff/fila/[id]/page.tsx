import { DetailView } from "./detail-view";

export default async function StaffFilaDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return <DetailView filaEntryId={id} />;
}
