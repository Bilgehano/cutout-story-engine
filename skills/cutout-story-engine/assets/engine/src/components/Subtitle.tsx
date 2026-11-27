import React from "react";

export const Subtitle: React.FC<{text?: string}> = ({text}) => !text ? null : (
  <div style={{position:"absolute", left:80, right:110, bottom:360, textAlign:"center"}}>
    <span style={{
      display:"inline-block", maxWidth:"100%", overflowWrap:"anywhere",
      padding:"8px 22px 10px", borderRadius:16, color:"#fff",
      backgroundColor:"rgba(20,18,18,0.84)", font:"600 52px/1.16 Arial, sans-serif",
    }}>{text}</span>
  </div>
);
