-- Ejecuta este SQL en Supabase > SQL Editor

-- Tabla de productos
CREATE TABLE products (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  stock INTEGER NOT NULL DEFAULT 0,
  min_stock INTEGER NOT NULL DEFAULT 1,
  unit TEXT NOT NULL DEFAULT 'unid.',
  price NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabla de historial
CREATE TABLE history (
  id BIGSERIAL PRIMARY KEY,
  product_name TEXT NOT NULL,
  change INTEGER NOT NULL,
  reason TEXT,
  old_stock INTEGER,
  new_stock INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Permitir acceso público (anon key) — la app usa PIN propio
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public_all_products" ON products FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "public_all_history" ON history FOR ALL USING (true) WITH CHECK (true);

-- Datos de ejemplo (opcional, puedes borrar estas líneas)
INSERT INTO products (name, stock, min_stock, unit, price) VALUES
  ('Cúrcuma en polvo 100g', 3, 5, 'unid.', 8500),
  ('Chía orgánica 500g', 12, 8, 'unid.', 12000),
  ('Espirulina 60 caps', 2, 6, 'unid.', 35000),
  ('Miel de abeja 500ml', 7, 4, 'unid.', 22000),
  ('Té de manzanilla x20', 1, 10, 'cajas', 6500),
  ('Aceite de coco 500ml', 9, 5, 'unid.', 28000),
  ('Magnesio 60 caps', 4, 6, 'unid.', 31000),
  ('Stevia polvo 100g', 0, 4, 'unid.', 9500);
