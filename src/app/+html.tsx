import { ScrollViewStyleReset } from 'expo-router/html';

export default function Root({ children }: { children: React.ReactNode }) {
  return (
    <html lang="th">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no" />
        
        {/* 🚀 คำสั่งประกาศิต: บังคับล้าง Cache ไอคอนมือถือขั้นสุดยอดโดยการเปลี่ยนชื่อเวอร์ชันใหม่ */}
        {/* เราต้องเปลี่ยนแค่ ?v=fresh ให้เป็น ?v=final_kill_v ครับ! */}
        <link rel="apple-touch-icon" href="/logo-square.png?v=final_kill_v" />
        <link rel="icon" type="image/png" href="/logo-square.png?v=final_kill_v" />
        
        {/* ตั้งค่าให้หน้าแอปดูเป็นแอปมือถือจริงๆ (ซ่อนแถบเบราว์เซอร์) */}
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="บัญชีลิเก" />

        <ScrollViewStyleReset />
      </head>
      <body>{children}</body>
    </html>
  );
}