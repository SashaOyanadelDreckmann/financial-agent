import Link from 'next/link';

export function ArtifactBubble({ artifact }: { artifact: any }) {
  if (artifact.type === 'pdf') {
    return (
      <div className="border rounded-lg p-4 bg-white shadow-sm space-y-2">
        <div className="font-semibold">{artifact.title}</div>
        {artifact.description && (
          <div className="text-sm text-gray-600">{artifact.description}</div>
        )}
        <Link
          href={artifact.fileUrl}
          target="_blank"
          className="inline-block mt-2 text-blue-600 underline"
        >
          Descargar PDF
        </Link>
      </div>
    );
  }

  if (artifact.type === 'chart') {
    return (
      <div className="border rounded-lg p-4 bg-white shadow-sm">
        <div className="font-semibold">{artifact.title}</div>
        <img
          src={artifact.previewImageUrl}
          alt={artifact.title}
          className="mt-2 rounded"
        />
      </div>
    );
  }

  return null;
}
