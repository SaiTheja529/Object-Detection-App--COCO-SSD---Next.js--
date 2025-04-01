"use client"; // Enables client-side rendering in Next.js (App Router)

import { useEffect, useRef, useState } from "react";
import * as cocoSsd from "@tensorflow-models/coco-ssd";
import * as tf from "@tensorflow/tfjs";

export default function WebcamObjectDetection() {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [model, setModel] = useState(null);
  const [isDetecting, setIsDetecting] = useState(false);
  const [detectedObjects, setDetectedObjects] = useState({});
  const [confidenceThreshold, setConfidenceThreshold] = useState(50);
  const [theme, setTheme] = useState("dark");

  useEffect(() => {
    const loadModel = async () => {
      const loadedModel = await cocoSsd.load();
      setModel(loadedModel);
    };
    loadModel();
  }, []);

  useEffect(() => {
    const startWebcam = async () => {
      if (videoRef.current) {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({ video: true });
          videoRef.current.srcObject = stream;
        } catch (error) {
          console.error("Error accessing webcam:", error);
        }
      }
    };
    startWebcam();
  }, []);

  useEffect(() => {
    let animationFrameId;

    const detectObjects = async () => {
      if (!model || !videoRef.current || !canvasRef.current || !isDetecting) return;

      const video = videoRef.current;
      const canvas = canvasRef.current;
      const ctx = canvas.getContext("2d");

      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;

      try {
        const predictions = await model.detect(video);
        const filteredPredictions = predictions.filter(pred => pred.score * 100 >= confidenceThreshold);

        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

        let updatedObjects = { ...detectedObjects };

        filteredPredictions.forEach((prediction) => {
          const objectName = prediction.class;
          updatedObjects[objectName] = (updatedObjects[objectName] || 0) + 1;

          // Draw bounding box
          ctx.strokeStyle = "#ff0000"; 
          ctx.lineWidth = 3;
          ctx.strokeRect(
            prediction.bbox[0], prediction.bbox[1],
            prediction.bbox[2], prediction.bbox[3]
          );

          // Draw label
          ctx.fillStyle = "#ff0000";
          ctx.font = "16px Arial";
          ctx.fillText(
            `${objectName} (${Math.round(prediction.score * 100)}%)`,
            prediction.bbox[0], prediction.bbox[1] > 10 ? prediction.bbox[1] - 5 : 10
          );
        });

        setDetectedObjects(updatedObjects);
      } catch (error) {
        console.error("Detection error:", error);
      }

      if (isDetecting) {
        animationFrameId = requestAnimationFrame(detectObjects);
      }
    };

    if (isDetecting) {
      animationFrameId = requestAnimationFrame(detectObjects);
    }

    return () => cancelAnimationFrame(animationFrameId);
  }, [model, isDetecting, confidenceThreshold]);

  const takeSnapshot = () => {
    const canvas = canvasRef.current;
    const snapshotUrl = canvas.toDataURL("image/png");
    const link = document.createElement("a");
    link.href = snapshotUrl;
    link.download = "object_detection_snapshot.png";
    link.click();
  };

  return (
    <div className={`${theme === "dark" ? "bg-gray-900 text-white" : "bg-gray-100 text-black"} flex flex-col items-center justify-center min-h-screen p-6`}>
      <h2 className="text-2xl font-bold mb-4 text-blue-400">Live Object Detection</h2>

      <div className="relative w-[640px] h-[480px] border-4 border-blue-500 rounded-lg shadow-lg overflow-hidden">
        <video ref={videoRef} autoPlay playsInline className="w-full h-full rounded-lg" />
        <canvas ref={canvasRef} className="absolute top-0 left-0" />
      </div>

      <div className="mt-6 flex space-x-4">
        <button
          onClick={() => setIsDetecting(!isDetecting)}
          className={`px-6 py-3 text-lg font-semibold rounded-lg transition-all duration-300 
                     ${isDetecting ? "bg-red-500 hover:bg-red-700" : "bg-blue-500 hover:bg-blue-700"} shadow-md`}
        >
          {isDetecting ? "Stop Detection" : "Start Detection"}
        </button>

        <button
          onClick={takeSnapshot}
          className="px-6 py-3 text-lg font-semibold rounded-lg bg-green-500 hover:bg-green-700 transition-all shadow-md"
        >
          Take Snapshot 📸
        </button>

        <button
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          className="px-6 py-3 text-lg font-semibold rounded-lg bg-gray-500 hover:bg-gray-700 transition-all shadow-md"
        >
          {theme === "dark" ? "Light Mode ☀️" : "Dark Mode 🌙"}
        </button>
      </div>

      <div className="mt-4 w-64">
        <label className="block text-sm font-medium">Confidence Threshold: {confidenceThreshold}%</label>
        <input
          type="range"
          min="10"
          max="100"
          value={confidenceThreshold}
          onChange={(e) => setConfidenceThreshold(e.target.value)}
          className="w-full cursor-pointer"
        />
      </div>

      <div className="mt-4 p-4 border rounded-lg shadow-md bg-gray-800 text-white w-64 transition-all duration-300 transform scale-105">
        <h3 className="text-lg font-semibold text-yellow-300">Detected Objects:</h3>
        {Object.keys(detectedObjects).length > 0 ? (
          <ul className="list-disc pl-5">
            {Object.entries(detectedObjects).map(([obj, count], index) => (
              <li 
                key={index} 
                className="capitalize bg-blue-500 text-white p-2 rounded-lg shadow-md transition-all duration-300 transform hover:scale-105"
              >
                {obj} ({count} times)
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-gray-400">No objects detected...</p>
        )}
      </div>
    </div>
  );
}
