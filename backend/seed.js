import db from "./db.js";

const wallpapers = [
  {
    title: "Mountain Sunset",
    category: "Nature",
    image_url: "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1600",
    thumbnail_url: "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=600"
  },
  {
    title: "Neon City",
    category: "City",
    image_url: "https://images.unsplash.com/photo-1519501025264-65ba15a82390?w=1600",
    thumbnail_url: "https://images.unsplash.com/photo-1519501025264-65ba15a82390?w=600"
  },
  {
    title: "Abstract Colors",
    category: "Abstract",
    image_url: "https://images.unsplash.com/photo-1541701494587-cb58502866ab?w=1600",
    thumbnail_url: "https://images.unsplash.com/photo-1541701494587-cb58502866ab?w=600"
  }
];

const insert = db.prepare(
  `INSERT INTO wallpapers (title, category, image_url, thumbnail_url)
   VALUES (?, ?, ?, ?)`
);

wallpapers.forEach((w) =>
  insert.run(w.title, w.category, w.image_url, w.thumbnail_url)
);

console.log("Sample wallpapers added.");