-- 001_seed_data.sql
-- Test seed data for local development.
-- Run AFTER the schema migration and RLS policies.
--
-- Creates a test user via auth.users (which triggers handle_new_user),
-- then populates projects and prompts with realistic 3D CAD examples.

-- ---------------------------------------------------------------------------
-- Test user (triggers auto-creation of public.users row)
-- ---------------------------------------------------------------------------

insert into auth.users (
  id,
  instance_id,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_user_meta_data,
  created_at,
  updated_at,
  role,
  aud
) values (
  'a1b2c3d4-0000-4000-8000-000000000001',
  '00000000-0000-0000-0000-000000000000',
  'dev@3dai.local',
  crypt('password123', gen_salt('bf')),
  now(),
  '{"full_name": "Dev User"}'::jsonb,
  now(),
  now(),
  'authenticated',
  'authenticated'
) on conflict (id) do nothing;

-- Set user defaults
update public.users
set defaults = '{
  "model": "gpt-4o",
  "max_steps": 5,
  "auto_evaluate": true
}'::jsonb
where id = 'a1b2c3d4-0000-4000-8000-000000000001';

-- ---------------------------------------------------------------------------
-- Projects
-- ---------------------------------------------------------------------------

insert into projects (id, user_id, name, description, config) values
(
  'b1000000-0000-4000-8000-000000000001',
  'a1b2c3d4-0000-4000-8000-000000000001',
  'Mechanical Parts',
  'Standard mechanical fasteners and hardware',
  '{"model": "gpt-4o", "max_steps": 5}'::jsonb
),
(
  'b1000000-0000-4000-8000-000000000002',
  'a1b2c3d4-0000-4000-8000-000000000001',
  'Enclosures',
  'Electronics enclosures and cases',
  '{"model": "gpt-4o", "max_steps": 8, "auto_evaluate": true}'::jsonb
),
(
  'b1000000-0000-4000-8000-000000000003',
  'a1b2c3d4-0000-4000-8000-000000000001',
  'Quick Prints',
  null,
  '{}'::jsonb
);

-- ---------------------------------------------------------------------------
-- Prompts — completed examples with real OpenSCAD code
-- ---------------------------------------------------------------------------

-- 1. Simple gear
insert into prompts (id, project_id, user_id, prompt, scad_code, status, score, model, auto_evaluate, max_steps, completed_at) values
(
  'c1000000-0000-4000-8000-000000000001',
  'b1000000-0000-4000-8000-000000000001',
  'a1b2c3d4-0000-4000-8000-000000000001',
  'A spur gear with 24 teeth, module 1, 5mm bore hole, 8mm thick',
  '// Spur gear: 24 teeth, module 1, 5mm bore, 8mm thick
$fn = 64;

module gear(teeth = 24, mod = 1, thickness = 8, bore = 5) {
    pitch_r = mod * teeth / 2;
    outer_r = pitch_r + mod;
    root_r  = pitch_r - 1.25 * mod;
    tooth_angle = 360 / teeth;

    difference() {
        linear_extrude(thickness)
            union() {
                circle(r = root_r);
                for (i = [0:teeth-1])
                    rotate(i * tooth_angle)
                        polygon([
                            [root_r * cos(-tooth_angle/4), root_r * sin(-tooth_angle/4)],
                            [outer_r * cos(-tooth_angle/8), outer_r * sin(-tooth_angle/8)],
                            [outer_r * cos(tooth_angle/8),  outer_r * sin(tooth_angle/8)],
                            [root_r * cos(tooth_angle/4),   root_r * sin(tooth_angle/4)]
                        ]);
            }
        translate([0, 0, -1])
            cylinder(h = thickness + 2, d = bore);
    }
}

gear();',
  'completed',
  8.5,
  'gpt-4o',
  true,
  5,
  now() - interval '2 hours'
);

-- 2. Threaded standoff
insert into prompts (id, project_id, user_id, prompt, scad_code, status, score, model, auto_evaluate, max_steps, completed_at) values
(
  'c1000000-0000-4000-8000-000000000002',
  'b1000000-0000-4000-8000-000000000001',
  'a1b2c3d4-0000-4000-8000-000000000001',
  'M4 hex standoff, 12mm tall, 7mm across flats',
  '// M4 hex standoff, 12mm tall, 7mm AF
$fn = 64;

module hex_standoff(height = 12, af = 7, bore = 4) {
    ar = af / (2 * cos(30));  // across-corners radius
    difference() {
        linear_extrude(height)
            circle(r = ar, $fn = 6);
        translate([0, 0, -1])
            cylinder(h = height + 2, d = bore);
    }
}

hex_standoff();',
  'completed',
  9.2,
  'gpt-4o',
  true,
  3,
  now() - interval '1 hour'
);

-- 3. Raspberry Pi case (enclosures project)
insert into prompts (id, project_id, user_id, prompt, scad_code, status, score, model, auto_evaluate, max_steps, completed_at) values
(
  'c1000000-0000-4000-8000-000000000003',
  'b1000000-0000-4000-8000-000000000002',
  'a1b2c3d4-0000-4000-8000-000000000001',
  'Simple open-top box for Raspberry Pi 4, with mounting holes and ventilation slots',
  '// Raspberry Pi 4 open-top case
$fn = 32;

module pi_case() {
    wall = 2;
    pcb  = [85, 56];
    h    = 20;
    clearance = 1;

    inner = [pcb.x + clearance*2, pcb.y + clearance*2];
    outer = [inner.x + wall*2, inner.y + wall*2];

    difference() {
        // Outer shell
        cube([outer.x, outer.y, h]);

        // Inner cavity
        translate([wall, wall, wall])
            cube([inner.x, inner.y, h]);

        // Ventilation slots on side
        for (i = [0:4])
            translate([-1, 10 + i*8, 8])
                cube([outer.x + 2, 3, 6]);

        // USB / ethernet cutouts on back
        translate([outer.x - wall - 1, 8, wall])
            cube([wall + 2, 40, 12]);
    }

    // Mounting posts
    mount_offsets = [[3.5, 3.5], [3.5+58, 3.5], [3.5, 3.5+49], [3.5+58, 3.5+49]];
    for (m = mount_offsets)
        translate([wall + clearance + m.x, wall + clearance + m.y, wall])
            difference() {
                cylinder(h = 3, r = 3.5);
                translate([0, 0, -1])
                    cylinder(h = 5, d = 2.7);
            }
}

pi_case();',
  'completed',
  7.8,
  'gpt-4o',
  true,
  5,
  now() - interval '30 minutes'
);

-- 4. A prompt that is currently running
insert into prompts (id, project_id, user_id, prompt, status, model, auto_evaluate, max_steps) values
(
  'c1000000-0000-4000-8000-000000000004',
  'b1000000-0000-4000-8000-000000000003',
  'a1b2c3d4-0000-4000-8000-000000000001',
  'Cable clip that snaps onto a 25mm desk edge, holds 3 cables up to 6mm diameter',
  'running',
  'gpt-4o',
  true,
  5
);

-- 5. A failed prompt
insert into prompts (id, project_id, user_id, prompt, status, error, model, auto_evaluate, max_steps) values
(
  'c1000000-0000-4000-8000-000000000005',
  'b1000000-0000-4000-8000-000000000003',
  'a1b2c3d4-0000-4000-8000-000000000001',
  'Impossible Klein bottle with internal threading',
  'failed',
  'OpenSCAD compilation failed after 3 retries: manifold error on self-intersecting geometry',
  'gpt-4o',
  true,
  5
);
