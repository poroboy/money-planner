# Money Planner

Web App / PWA ภาษาไทยสำหรับบันทึกรายรับ รายจ่าย และภาระผ่อนรายเดือน รองรับ **Firebase Google Login + Cloud Firestore + Firebase Hosting** พร้อมเอาขึ้น GitHub และเปิดใช้งานจริงได้

## ฟีเจอร์ใน MVP นี้

- Login ด้วย Google ผ่าน Firebase Authentication
- Dashboard ภาพรวมรายเดือน
- เพิ่ม / ลบ รายรับ
- เพิ่ม / ลบ / เปลี่ยนสถานะ รายจ่าย
- เพิ่ม / ลบ Payment Source เช่น Shopee, Lazada, Credit Card, PayLater
- เพิ่ม / ลบ รายการผ่อนแบบ transaction ย่อย
- คำนวณภาระผ่อนล่วงหน้า 12 เดือน
- Summary ตามแหล่งจ่าย เช่น Shopee เดือนนี้ต้องจ่ายเท่าไหร่
- Before / After หลังเพิ่มรายการผ่อนใหม่
- Payment Reminder View เรียงตามวันครบกำหนด
- Demo Data สำหรับทดสอบ
- Firestore Security Rules ให้ user อ่าน/เขียนเฉพาะข้อมูลตัวเอง
- พร้อม deploy ไป Firebase Hosting

---

## 1) ติดตั้งโปรเจกต์ในเครื่อง

```bash
npm install
npm run dev
```

เปิด local URL ที่ Vite แสดง เช่น `http://localhost:5173`

---

## 2) ตั้งค่า Firebase Project

1. เข้า Firebase Console แล้วสร้าง Project
2. เพิ่ม Web App ใน Project
3. เปิด **Authentication > Sign-in method > Google**
4. เปิด **Firestore Database**
5. ไปที่ Project Settings > General > Your apps > Firebase SDK snippet > Config
6. Copy ค่า config มาใส่ในไฟล์ `.env`

สร้างไฟล์ `.env` จาก template:

```bash
cp .env.example .env
```

แล้วใส่ค่าให้ครบ:

```env
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
```

> หมายเหตุ: Firebase config ของ Web App ไม่ใช่ secret แบบ private key แต่ไม่ควร commit ไฟล์ `.env` จริงขึ้น GitHub ให้ commit แค่ `.env.example`

---

## 3) ตั้งค่า Authorized domains สำหรับ Google Login

ใน Firebase Console ไปที่:

**Authentication > Settings > Authorized domains**

ควรมี domain เหล่านี้:

- `localhost` สำหรับทดสอบในเครื่อง
- `YOUR_PROJECT_ID.web.app` สำหรับ Firebase Hosting
- `YOUR_PROJECT_ID.firebaseapp.com` สำหรับ Firebase Hosting

---

## 4) ตั้งค่า Firestore Rules

ไฟล์ `firestore.rules` มี rules ให้แล้ว:

```js
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;

      match /{document=**} {
        allow read, write: if request.auth != null && request.auth.uid == userId;
      }
    }
  }
}
```

วิธีใช้มี 2 แบบ:

### แบบง่าย: วางใน Firebase Console
ไปที่ **Firestore Database > Rules** แล้ว copy rules ด้านบนไปวาง จากนั้นกด Publish

### แบบ CLI
```bash
npm install -g firebase-tools
firebase login
firebase use --add
npm run deploy:rules
```

---

## 5) ทดสอบก่อนเอาขึ้นจริง

```bash
npm run dev
```

ลองเช็ก flow หลัก:

- Login ด้วย Google ได้หรือไม่
- กดเพิ่ม Demo Data ในหน้า Settings
- เพิ่ม Payment Source เช่น Shopee / Credit Card
- เพิ่มรายการผ่อนใหม่
- ดู Dashboard และ Forecast ว่าตัวเลขเปลี่ยนหรือไม่
- Logout แล้ว Login ใหม่ ข้อมูลยังอยู่หรือไม่

---

## 6) เอาขึ้น GitHub

สร้าง repository ใหม่ใน GitHub แล้วรันคำสั่งนี้ในโฟลเดอร์โปรเจกต์:

```bash
git init
git add .
git commit -m "Initial Money Planner app"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPOSITORY.git
git push -u origin main
```

ไฟล์ `.gitignore` ถูกเตรียมไว้แล้ว เพื่อไม่ให้ push `node_modules`, `dist`, `.env` และไฟล์ debug ขึ้น GitHub

---

## 7) Deploy ไป Firebase Hosting

ในโฟลเดอร์โปรเจกต์ รัน:

```bash
npm install -g firebase-tools
firebase login
firebase use --add
```

เลือก Firebase Project ที่สร้างไว้

จากนั้น copy `.firebaserc.example` เป็น `.firebaserc` แล้วแก้ project id:

```bash
cp .firebaserc.example .firebaserc
```

ตัวอย่าง `.firebaserc`:

```json
{
  "projects": {
    "default": "your-firebase-project-id"
  }
}
```

Deploy:

```bash
npm run deploy
```

หรือ deploy แค่ Hosting:

```bash
npm run deploy:hosting
```

หลัง deploy สำเร็จ Firebase จะให้ URL ประมาณนี้:

```txt
https://YOUR_PROJECT_ID.web.app
```

---

## 8) โครงสร้างข้อมูล Firestore

```txt
users/{userId}
users/{userId}/income/{incomeId}
users/{userId}/expenses/{expenseId}
users/{userId}/paymentSources/{sourceId}
users/{userId}/installments/{installmentId}
```

ตัวอย่าง logic ภาระผ่อน:

- Shopee: หูฟัง 500 บาท/เดือน เหลือ 5 เดือน
- Shopee: เครื่องดูดฝุ่น 1,200 บาท/เดือน เหลือ 3 เดือน
- Credit Card: มือถือ 1,500 บาท/เดือน เหลือ 6 เดือน

ระบบจะไม่รวม Shopee เป็นก้อนเดียว แต่จะคิดจาก transaction ย่อย แล้วค่อยรวมยอดรายเดือนตามแหล่งจ่าย

---

## 9) ไฟล์สำคัญ

```txt
src/lib/firebase.ts                 Firebase config
src/hooks/useAuth.ts                Google Login / Logout
src/hooks/useCollection.ts          Real-time Firestore listener
src/services/firestore.ts           Add / Delete / Update data
src/utils/calculations.ts           Dashboard + Forecast logic
src/App.tsx                         Main UI
firestore.rules                     Security rules
firebase.json                       Firebase Hosting config
.env.example                        Firebase env template
.firebaserc.example                 Firebase project template
```

---

## 10) สิ่งที่ยังไม่ได้ทำใน MVP นี้

- Edit form แบบเต็มสำหรับแก้ไขรายการเดิม
- Export Excel
- แนบรูปใบเสร็จด้วย Firebase Storage
- Push notification แจ้งเตือนวันครบกำหนด
- Chart visualization แบบละเอียด
- GitHub Actions auto deploy

แนะนำให้เปิดใช้งานจริงด้วย Firebase Hosting ก่อน แล้วค่อยต่อยอดฟีเจอร์เหล่านี้ทีหลัง
