import React, { useState } from "react";
import { Image } from "react-native";

export default function SafeImage({ uri, style }) {
  const [error, setError] = useState(false);

  let safeUri = null;

  if (typeof uri === "string") safeUri = uri;
  else if (uri?.url) safeUri = uri.url;

  if (!safeUri || error) {
    safeUri = "https://via.placeholder.com/150";
  }

  return (
    <Image
      source={{ uri: safeUri }}
      style={style}
      onError={() => setError(true)}
    />
  );
}