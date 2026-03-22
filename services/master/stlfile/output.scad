$fn = 120;

// --- Dimensions ---

// Trunk dimensions
trunk_base_radius = 10; // mm
trunk_top_radius = 7; // mm (for slight taper)
trunk_height = 70; // mm

// Canopy dimensions
canopy_sphere_main_radius = 16; // mm (radius for main leaf clusters)
canopy_sphere_offset_factor_x = 0.5; // Factor to offset auxiliary spheres
canopy_sphere_offset_factor_y = 0.7; // Factor to offset auxiliary spheres
canopy_sphere_offset_factor_z = 0.8; // Factor to offset auxiliary spheres
canopy_sphere_scale_factor_1 = 0.8; // Scale for first auxiliary sphere
canopy_sphere_scale_factor_2 = 0.9; // Scale for second auxiliary sphere
canopy_sphere_scale_factor_3 = 0.85; // Scale for third auxiliary sphere
canopy_sphere_scale_factor_4 = 0.75; // Scale for fourth auxiliary sphere

// --- Components ---

module trunk() {
    color("brown") {
        cylinder(h = trunk_height, r1 = trunk_base_radius, r2 = trunk_top_radius, center = false);
    }
}

module canopy() {
    color("green") {
        union() {
            // Main central leaf cluster
            translate([0, 0, trunk_height + canopy_sphere_main_radius * 0.5]) {
                sphere(r = canopy_sphere_main_radius);
            }

            // Auxiliary leaf clusters for a more organic shape
            translate([
                canopy_sphere_main_radius * canopy_sphere_offset_factor_x, 
                canopy_sphere_main_radius * canopy_sphere_offset_factor_y, 
                trunk_height + canopy_sphere_main_radius * canopy_sphere_offset_factor_z * 1.0
            ]) {
                sphere(r = canopy_sphere_main_radius * canopy_sphere_scale_factor_1);
            }
            translate([
                -canopy_sphere_main_radius * canopy_sphere_offset_factor_y, 
                canopy_sphere_main_radius * canopy_sphere_offset_factor_x, 
                trunk_height + canopy_sphere_main_radius * canopy_sphere_offset_factor_z * 0.8
            ]) {
                sphere(r = canopy_sphere_main_radius * canopy_sphere_scale_factor_2);
            }
            translate([
                canopy_sphere_main_radius * canopy_sphere_offset_factor_x * 0.8, 
                -canopy_sphere_main_radius * canopy_sphere_offset_factor_y * 1.2, 
                trunk_height + canopy_sphere_main_radius * canopy_sphere_offset_factor_z * 0.9
            ]) {
                sphere(r = canopy_sphere_main_radius * canopy_sphere_scale_factor_3);
            }
            translate([
                -canopy_sphere_main_radius * canopy_sphere_offset_factor_y * 1.1, 
                -canopy_sphere_main_radius * canopy_sphere_offset_factor_x * 0.9, 
                trunk_height + canopy_sphere_main_radius * canopy_sphere_offset_factor_z * 1.1
            ]) {
                sphere(r = canopy_sphere_main_radius * canopy_sphere_scale_factor_4);
            }
        }
    }
}

// --- Assembly ---

module tree() {
    trunk();
    canopy();
}

tree();