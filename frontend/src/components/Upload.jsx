import { useCallback } from "react";
import { useDropzone } from "react-dropzone";

export default function Upload({ onUpload, error }) {
  const onDrop = useCallback(acceptedFiles => {
    if (acceptedFiles.length > 0) {
      onUpload(acceptedFiles[0]);
    }
  }, [onUpload]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "video/*": [".mp4", ".mov", ".avi", ".mkv"] },
    maxFiles: 1,
  });

  return (
    <div style={{ width: "100%", maxWidth: 520, margin: "0 auto" }}>
      <div
        {...getRootProps()}
        style={{
          border: `2px dashed ${isDragActive ? "#1D9E75" : "#ddd"}`,
          borderRadius: 16,
          padding: "48px 32px",
          textAlign: "center",
          cursor: "pointer",
          background: isDragActive ? "#E1F5EE" : "#fafafa",
          transition: "all 0.2s",
          fontFamily: "DM Sans, sans-serif",
        }}
      >
        <input {...getInputProps()} />
        <div style={{ fontSize: 40, marginBottom: 12 }}>🎬</div>
        <div style={{ fontSize: 16, fontWeight: 600, color: "#222", marginBottom: 6 }}>
          {isDragActive ? "Drop it here" : "Drop your video here"}
        </div>
        <div style={{ fontSize: 13, color: "#aaa" }}>
          or click to browse · MP4, MOV, AVI, MKV
        </div>
      </div>
      {error && (
        <div style={{ marginTop: 12, background: "#FCEBEB", border: "1px solid #F7C1C1", borderRadius: 8, padding: "10px 14px", fontSize: 13, color: "#791F1F" }}>
          {error}
        </div>
      )}
    </div>
  );
}