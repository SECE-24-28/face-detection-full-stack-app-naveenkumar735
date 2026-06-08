"use client";

import React, { useState, useEffect } from "react";

interface Detection {
  id: number;
  imageName: string;
  isHuman: boolean;
  createdAt: string;
}

export default function Home() {
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [imageDimensions, setImageDimensions] = useState<{ width: number; height: number } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<any | null>(null);
  const [history, setHistory] = useState<Detection[]>([]);

  // Fetch scan history from db
  const fetchHistory = async () => {
    try {
      const res = await fetch("/api/detections");
      if (!res.ok) throw new Error("Failed to fetch history");
      const data = await res.json();
      if (data.success) {
        setHistory(data.detections);
      }
    } catch (err: any) {
      console.error("Error loading history:", err);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      setFile(selectedFile);
      setError(null);
      setResult(null);

      // Create local preview URL and get image dimensions
      const url = URL.createObjectURL(selectedFile);
      setPreviewUrl(url);

      const img = new Image();
      img.onload = () => {
        setImageDimensions({ width: img.naturalWidth, height: img.naturalHeight });
      };
      img.src = url;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      setError("Please select an image file first.");
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("/api/detect", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Face detection request failed.");
      }

      setResult(data);
      // Refresh scan history
      fetchHistory();
    } catch (err: any) {
      setError(err.message || "An error occurred during detection.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h1>Face Detection Analyzer</h1>
      <hr />

      <h3>1. Upload an Image</h3>
      <form onSubmit={handleSubmit}>
        <div>
          <label>Select image file: </label>
          <input
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            disabled={loading}
          />
        </div>
        <br />
        <div>
          <button type="submit" disabled={loading}>
            {loading ? "Analyzing image..." : "Upload & Detect Face"}
          </button>
        </div>
      </form>

      {loading && (
        <div>
          <p><strong>Status:</strong> Processing image with Face++ API... Please wait...</p>
        </div>
      )}

      {error && (
        <div>
          <p><strong>[ERROR]:</strong> {error}</p>
        </div>
      )}

      {previewUrl && imageDimensions && (
        <div>
          <h4>Image Preview {result ? "& Detected Faces" : ""}:</h4>
          <svg
            width={imageDimensions.width}
            height={imageDimensions.height}
            viewBox={`0 0 ${imageDimensions.width} ${imageDimensions.height}`}
            style={{ maxWidth: "500px", height: "auto", border: "2px solid black" }}
          >
            <image
              href={previewUrl}
              width={imageDimensions.width}
              height={imageDimensions.height}
            />
            {result?.facesDetails?.map((face: any, idx: number) => {
              // Calculate stroke width relative to the image size for clean rendering
              const strokeWidth = Math.max(3, Math.round(imageDimensions.width / 150));
              return (
                <rect
                  key={idx}
                  x={face.face_rectangle.left}
                  y={face.face_rectangle.top}
                  width={face.face_rectangle.width}
                  height={face.face_rectangle.height}
                  fill="none"
                  stroke="red"
                  strokeWidth={strokeWidth}
                />
              );
            })}
          </svg>
        </div>
      )}

      {result && (
        <div>
          <h3>2. Analysis Result</h3>
          <p><strong>Filename:</strong> {result.detection.imageName}</p>
          <p>
            <strong>Verdict:</strong>{" "}
            {result.detection.isHuman ? (
              <strong>HUMAN FACE DETECTED</strong>
            ) : (
              "NO HUMAN FACE DETECTED"
            )}
          </p>
          <p><strong>Number of faces:</strong> {result.faceCount}</p>
          {result.facesDetails && result.facesDetails.length > 0 && (
            <div>
              <p><strong>Face Coordinates Details:</strong></p>
              <ul>
                {result.facesDetails.map((face: any, idx: number) => (
                  <li key={idx}>
                    Face #{idx + 1}: Top={face.face_rectangle.top}, Left={face.face_rectangle.left}, Width={face.face_rectangle.width}, Height={face.face_rectangle.height} (Token: {face.face_token})
                  </li>
                ))}
              </ul>
            </div>
          )}
          
          <details>
            <summary>View Raw Face++ API Response Data</summary>
            <pre style={{ backgroundColor: "#f0f0f0", padding: "10px" }}>
              {JSON.stringify(result, null, 2)}
            </pre>
          </details>
          <hr />
        </div>
      )}

      <br />
      <h3>3. Detection History Logs (from database)</h3>
      {history.length === 0 ? (
        <p>No detection logs found in the database yet.</p>
      ) : (
        <table border={1} cellPadding={5} cellSpacing={0}>
          <thead>
            <tr>
              <th>ID</th>
              <th>Filename</th>
              <th>Human Face Detected?</th>
              <th>Scanned At</th>
            </tr>
          </thead>
          <tbody>
            {history.map((record) => (
              <tr key={record.id}>
                <td>{record.id}</td>
                <td>{record.imageName}</td>
                <td>{record.isHuman ? "Yes" : "No"}</td>
                <td>{new Date(record.createdAt).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}