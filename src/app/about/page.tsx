"use client";

import React from "react";
import useAbout from "./useAbout";

const AboutPage: React.FC = () => {
  const { width, height } = useAbout();
  return (
    <div>
      <p>窗口宽度: {width}px</p>
      <p>窗口高度: {height}px</p>
    </div>
  );
};
export default AboutPage;
