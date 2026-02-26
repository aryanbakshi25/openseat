-- OpenSeat Supabase Schema
-- Run this in the Supabase SQL Editor to create the tables.

-- Libraries
CREATE TABLE IF NOT EXISTS libraries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text UNIQUE NOT NULL,
  name text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Reservable Rooms
CREATE TABLE IF NOT EXISTS rooms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  library_id uuid NOT NULL REFERENCES libraries(id) ON DELETE CASCADE,
  display_name text NOT NULL,
  floor text,
  capacity int,
  external_system text,   -- e.g. 'libcal', 'unitime', 'outlook'
  external_id text,       -- ID in the external system
  is_reservable boolean DEFAULT true
);

-- Open-Space Locations (for crowding data)
CREATE TABLE IF NOT EXISTS open_space_locations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  library_id uuid NOT NULL REFERENCES libraries(id) ON DELETE CASCADE,
  display_name text NOT NULL,
  external_system text,   -- e.g. 'occuspace', 'waitz'
  external_id text,
  capacity int
);

-- Optional: cache table for computed availability responses
CREATE TABLE IF NOT EXISTS availability_cache (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  library_id uuid NOT NULL REFERENCES libraries(id) ON DELETE CASCADE,
  as_of timestamptz NOT NULL DEFAULT now(),
  payload jsonb NOT NULL
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_rooms_library ON rooms(library_id);
CREATE INDEX IF NOT EXISTS idx_open_space_library ON open_space_locations(library_id);
CREATE INDEX IF NOT EXISTS idx_availability_cache_library ON availability_cache(library_id);
