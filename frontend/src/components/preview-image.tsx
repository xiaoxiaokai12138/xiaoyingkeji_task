"use client";

import Image, { type ImageProps } from "next/image";
import { useState } from "react";

// Changing the source creates a fresh loading attempt, including after replacing an upload.
export function PreviewImage(props: ImageProps) {
  return <LoadableImage key={String(props.src)} {...props} />;
}

function LoadableImage(props: ImageProps) {
  const [failed, setFailed] = useState(false);
  if (failed) return <span className="image-fallback" role="img" aria-label={`${props.alt}，图片暂时无法加载`}><span aria-hidden="true">▧</span>图片暂时无法加载<small>请刷新页面或稍后查看</small></span>;
  return <Image {...props} alt={props.alt} onError={() => setFailed(true)} />;
}
