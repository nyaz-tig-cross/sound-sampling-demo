import React, { useState, useRef } from "react";

export default function AudioProcessorApp() {
  const [audioBuffer, setAudioBuffer] = useState(null);
  const [sampleRate, setSampleRate] = useState(44100);
  const [bitDepth, setBitDepth] = useState(16);
  const [isPlaying, setIsPlaying] = useState(false);
  const audioContextRef = useRef(null);
  const sourceRef = useRef(null);

  // 音声ファイルのドロップ処理
  const handleDrop = async (e) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (!file) return;

    const arrayBuffer = await file.arrayBuffer();
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const decodedData = await audioContext.decodeAudioData(arrayBuffer);
    setAudioBuffer(decodedData);
    audioContextRef.current = audioContext;
  };

  // 再生（変更なし）
  const playOriginal = () => {
    if (!audioBuffer) return;
    stopAudio();

    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const src = ctx.createBufferSource();
    src.buffer = audioBuffer;
    src.connect(ctx.destination);
    src.start();
    sourceRef.current = src;
    audioContextRef.current = ctx;
    setIsPlaying(true);

    src.onended = () => setIsPlaying(false);
  };

  // 加工して再生
  const playProcessed = async () => {
    if (!audioBuffer) return;
    stopAudio();

    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const offlineCtx = new OfflineAudioContext(
      audioBuffer.numberOfChannels,
      audioBuffer.length,
      sampleRate
    );

    // 元の音声データをコピー
    const buffer = offlineCtx.createBuffer(
      audioBuffer.numberOfChannels,
      audioBuffer.length,
      audioBuffer.sampleRate
    );
    for (let ch = 0; ch < audioBuffer.numberOfChannels; ch++) {
      buffer.copyToChannel(audioBuffer.getChannelData(ch), ch);
    }

    const src = offlineCtx.createBufferSource();
    src.buffer = buffer;
    src.connect(offlineCtx.destination);
    src.start();

    const rendered = await offlineCtx.startRendering();

    // 量子化処理
    const processedBuffer = ctx.createBuffer(
      rendered.numberOfChannels,
      rendered.length,
      rendered.sampleRate
    );

    for (let ch = 0; ch < rendered.numberOfChannels; ch++) {
      const channelData = rendered.getChannelData(ch);
      const processedData = processedBuffer.getChannelData(ch);
      const step = Math.pow(2, bitDepth) / 2;

      for (let i = 0; i < channelData.length; i++) {
        processedData[i] =
          Math.round(channelData[i] * step) / step;
      }
    }

    const srcNode = ctx.createBufferSource();
    srcNode.buffer = processedBuffer;
    srcNode.connect(ctx.destination);
    srcNode.start();

    sourceRef.current = srcNode;
    audioContextRef.current = ctx;
    setIsPlaying(true);

    srcNode.onended = () => setIsPlaying(false);
  };

  // 停止ボタン
  const stopAudio = () => {
    if (sourceRef.current) {
      try {
        sourceRef.current.stop();
      } catch {}
      sourceRef.current.disconnect();
      sourceRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    setIsPlaying(false);
  };

  const handleDragOver = (e) => e.preventDefault();

  return (
    <div className="flex flex-col items-center min-h-screen bg-gray-100 p-6">
      <h1 className="text-2xl font-bold mb-4">🎧 音声加工・再生アプリ</h1>

      {/* ドロップゾーン */}
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        className="border-4 border-dashed border-gray-400 rounded-2xl w-96 h-32 flex items-center justify-center text-gray-500 mb-6"
      >
        音声ファイルをここにドロップ
      </div>

      {/* スライダー部分 */}
      <div className="bg-white rounded-2xl shadow p-4 w-96">
        <div className="mb-4">
          <label className="font-semibold">
            サンプリング周波数（Hz）: {sampleRate}
          </label>
          <input
            type="range"
            min="8000"
            max="48000"
            step="8000"
            value={sampleRate}
            onChange={(e) => setSampleRate(Number(e.target.value))}
            className="w-full accent-blue-500"
          />
        </div>

        <div>
          <label className="font-semibold">
            量子化ビット数（bit）: {bitDepth}
          </label>
          <input
            type="range"
            min="4"
            max="16"
            step="4"
            value={bitDepth}
            onChange={(e) => setBitDepth(Number(e.target.value))}
            className="w-full accent-green-500"
          />
        </div>
      </div>

      {/* ボタン群 */}
      <div className="flex gap-4 mt-6">
        <button
          onClick={playOriginal}
          disabled={!audioBuffer || isPlaying}
          className="px-4 py-2 bg-blue-500 text-white rounded-2xl hover:bg-blue-600 disabled:opacity-50"
        >
          再生
        </button>

        <button
          onClick={playProcessed}
          disabled={!audioBuffer || isPlaying}
          className="px-4 py-2 bg-green-500 text-white rounded-2xl hover:bg-green-600 disabled:opacity-50"
        >
          加工して再生
        </button>

        <button
          onClick={stopAudio}
          disabled={!isPlaying}
          className="px-4 py-2 bg-red-500 text-white rounded-2xl hover:bg-red-600 disabled:opacity-50"
        >
          停止
        </button>
      </div>
    </div>
  );
}
