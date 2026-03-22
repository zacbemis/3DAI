$fn = 120; // For smooth curves

// Overall laptop dimensions
laptop_length = 90; // X-axis
laptop_width = 60; // Y-axis
laptop_thickness_base = 8; // Z-axis for base
laptop_thickness_screen = 6; // Z-axis for screen

// Base component dimensions
base_length = laptop_length;
base_width = laptop_width;
base_thickness = laptop_thickness_base;

// Keyboard dimensions
keyboard_margin_x = 5;
keyboard_margin_y_bottom = 20; // Margin from the front edge
keyboard_margin_y_top = 8;     // Margin from the hinge edge
keyboard_recess_depth = 1;
keyboard_length = base_length - 2 * keyboard_margin_x;
keyboard_width = base_width - keyboard_margin_y_bottom - keyboard_margin_y_top;

// Touchpad dimensions
touchpad_length = 15;
touchpad_width = 25;
touchpad_margin_x = (base_length - touchpad_width) / 2; // Centered
touchpad_margin_y_bottom = 5; // Margin from the front edge
touchpad_recess_depth = 1;

// Screen component dimensions
screen_length = laptop_length;
screen_width = laptop_width;
screen_thickness = laptop_thickness_screen;

// Display dimensions
display_margin_x = 4;
display_margin_y_bottom = 8; // Margin from the bottom edge of the screen frame
display_margin_y_top = 4;    // Margin from the top edge of the screen frame
display_recess_depth = 1;
display_length = screen_length - 2 * display_margin_x;
display_width = screen_width - display_margin_y_bottom - display_margin_y_top;

// Hinge dimensions
hinge_radius = 2;
hinge_segments = 3;
hinge_gap = 4; // Gap between hinge segments
hinge_margin_x = 10; // Margin from the side edges of the laptop for the hinge mechanism
hinge_length = (base_length - 2 * hinge_margin_x - (hinge_segments - 1) * hinge_gap) / hinge_segments;
hinge_offset_y = -hinge_radius; // Position hinge axis slightly behind the laptop's back edge
hinge_rotation_angle = 100; // Angle in degrees the screen is open

// --- Components ---

module laptop_base() {
    difference() {
        // Main base body
        cube([base_length, base_width, base_thickness]);

        // Keyboard recess
        translate([keyboard_margin_x, keyboard_margin_y_bottom, base_thickness - keyboard_recess_depth])
        cube([keyboard_length, keyboard_width, keyboard_recess_depth + 0.1]); // +0.1 to ensure full cutout

        // Touchpad recess
        translate([touchpad_margin_x, touchpad_margin_y_bottom, base_thickness - touchpad_recess_depth])
        cube([touchpad_width, touchpad_length, touchpad_recess_depth + 0.1]); // +0.1 to ensure full cutout
    }
}

module laptop_screen() {
    difference() {
        // Main screen body
        cube([screen_length, screen_width, screen_thickness]);

        // Display recess
        translate([display_margin_x, display_margin_y_bottom, screen_thickness - display_recess_depth])
        cube([display_length, display_width, display_recess_depth + 0.1]);
    }
}

module laptop_hinge_segments() {
    // Generate multiple hinge segments along the back edge of the laptop
    for (i = [0 : hinge_segments - 1]) {
        // Calculate the x-offset for each hinge segment
        x_position = hinge_margin_x + i * (hinge_length + hinge_gap);
        
        // Position the center of the cylinder at the correct x,y,z
        // Rotate the cylinder to be along the x-axis
        translate([x_position + hinge_length / 2, hinge_offset_y, base_thickness])
        rotate([90, 0, 0])
        cylinder(h = hinge_length, r = hinge_radius, center = true);
    }
}

// --- Assembly ---

module laptop() {
    // Laptop base
    laptop_base();

    // Laptop screen
    // Translate screen to be on top of the base at its back edge
    // Then rotate it around the x-axis (the hinge axis)
    translate([0, 0, base_thickness])
    rotate([hinge_rotation_angle, 0, 0])
    laptop_screen();

    // Hinge mechanism
    laptop_hinge_segments();
}

// Render the laptop assembly
laptop();