import { useCallback } from "react";
import { useDropzone } from "react-dropzone";

export default function Upload({ onUpload, error }) {
  const onDrop = useCallback(
    (acceptedFiles) => {
      if (acceptedFiles.length > 0) {
        onUpload(acceptedFiles[0]);
      }
    },
    [onUpload]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "video/*": [".mp4", ".mov", ".avi", ".mkv"] },
    maxFiles: 1,
  });

  return (
    <div className="upload-widget">
      <div
        {...getRootProps()}
        style={{
          border: `1.5px dashed ${isDragActive ? "rgba(59,130,246,0.7)" : "rgba(229,231,235,0.14)"}`,
          borderRadius: "24px",
          padding: "42px 28px",
          textAlign: "center",
          cursor: "pointer",
          background: isDragActive
            ? "linear-gradient(135deg, rgba(59,130,246,0.14), rgba(124,58,237,0.12))"
            : "rgba(255,255,255,0.025)",
          transition: "all 0.22s ease",
        }}
      >
        <input {...getInputProps()} />

        <div
          style={{
            width: 72,
            height: 72,
            margin: "0 auto 18px",
            display: "grid",
            placeItems: "center",
            borderRadius: 20,
            color: "#fff",
            fontSize: 28,
            background: "linear-gradient(135deg, #3B82F6, #7C3AED)",
            boxShadow: "0 18px 38px rgba(59,130,246,0.28)",
          }}
        >
          🎬
        </div>

        <div
          style={{
            fontSize: 22,
            fontWeight: 800,
            color: "#E5E7EB",
            marginBottom: 10,
            letterSpacing: "-0.03em",
          }}
        >
          {isDragActive ? "Drop video to start analysis" : "Drop your video here"}
        </div>

        <div
          style={{
            fontSize: 14,
            lineHeight: 1.7,
            color: "#9CA3AF",
          }}
        >
          Drag and drop your file or click to browse.
          <br />
          Supported formats: MP4, MOV, AVI, MKV
        </div>
      </div>

      {error && (
        <div
          style={{
            marginTop: 14,
            borderRadius: 16,
            padding: "14px 16px",
            border: "1px solid rgba(239,68,68,0.28)",
            background: "rgba(239,68,68,0.12)",
            color: "#FCA5A5",
            fontSize: 14,
            lineHeight: 1.6,
          }}
        >
          {error}
        </div>
      )}
    </div>
  );
}