# רק רגע לקרוא

## תיאור

"רק רגע לקרוא" היא אפליקציית עזר להורים ליצירת תרגולי קריאה קצרים ומותאמים אישית לילדות ולילדים.

## מטרת הפרויקט

הפרויקט נמצא כעת בשלב הקמת התשתית הראשונית (client + server).

## מבנה הפרויקט

- `client/` — אפליקציית React (Vite)
- `server/` — Express API (CommonJS)

## דרישות מוקדמות

הפרויקט פותח ונבדק עם Node.js 24 ו-npm 11.

## התקנה — צד לקוח

```bash
cd client
npm install
```

## התקנה — צד שרת

```bash
cd server
npm install
```

## הרצת צד הלקוח

```bash
cd client
npm run dev
```

## הרצת השרת

```bash
cd server
cp .env.example .env
npm run dev
```

## הרצת בדיקות

בדיקות אוטומטיות מוגדרות כרגע בצד השרת בלבד (עם Jest). בצד הלקוח אין עדיין script של בדיקות.

```bash
cd server
npm test
```

## Linting — צד שרת

```bash
cd server
npm run lint
```

## Linting — צד לקוח

```bash
cd client
npm run lint
```
