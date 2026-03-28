/**
 * StorageImage — Renders an image from a storage path or URL.
 * Uses useSignedStorageUrl for auto-renewal of signed URLs.
 */
import { useSignedStorageUrl } from "@/hooks/useSignedStorageUrl";

interface StorageImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src: string | null | undefined;
  bucket?: string;
  fallback?: React.ReactNode;
}

export default function StorageImage({ src: pathOrUrl, bucket, fallback, ...imgProps }: StorageImageProps) {
  const { url, loading, error } = useSignedStorageUrl(pathOrUrl, { bucket });

  if (!pathOrUrl || (!url && !loading)) {
    return fallback ? <>{fallback}</> : null;
  }

  if (loading) {
    return (
      <div className={imgProps.className} style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div className="w-4 h-4 border-2 border-muted-foreground/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  if (error && !url) {
    return fallback ? <>{fallback}</> : null;
  }

  return <img {...imgProps} src={url!} />;
}
