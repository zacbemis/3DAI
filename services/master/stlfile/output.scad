$fn = 64;

// Car Body Dimensions (overall dimensions L=80, W=40, H=45, within 20-120mm)
car_length = 80;
car_width = 40;
car_base_height = 20; // Height of the lower body part
cabin_length = 45;
cabin_width = 35;
cabin_height = 25; // Height of the cabin part

// Wheel dimensions
wheel_radius = 7.5;
wheel_thickness = 10;
wheel_offset_x = 10; // Distance from front/back edge for wheel center
wheel_offset_y = 5; // Distance from side edge for wheel center

// Headlight dimensions
headlight_radius = 4;
headlight_depth = 2; // Actual depth of the light 'bulb'
headlight_recess_depth = 3; // How deep the cutout goes into the body
headlight_offset_x = 5; // Distance from front edge for headlight center
headlight_offset_y = 5; // Distance from side edge (from car_width/2) for headlight center

module wheel() {
    color("dimgray") {
        cylinder(h = wheel_thickness, r = wheel_radius, center = true);
        // Small hub detail
        translate([0, 0, -wheel_thickness/2 + 1])
        color("darkgray") cylinder(h = 2, r = wheel_radius * 0.5);
    }
}

module headlight_part() {
    color("gold") {
        // Position the actual light within its recess.
        // It's placed such that its front face is near the opening of the recess.
        translate([headlight_recess_depth/2, 0, 0])
        cylinder(h = headlight_depth, r = headlight_radius, center = true);
    }
}

module car_main_body() {
    color("yellow") {
        difference() {
            union() {
                // Main lower body part
                // Centered horizontally, bottom at Z=0
                translate([0, 0, car_base_height/2])
                cube([car_length, car_width, car_base_height], center = true);

                // Cabin part
                // Positioned on top of the main body, shifted towards the rear
                translate([car_length/4, 0, car_base_height + cabin_height/2])
                cube([cabin_length, cabin_width, cabin_height], center = true);
            }

            // Cutters for front and rear slopes (angled wedges)
            // Front slope cutter
            translate([-car_length/2 + 10, 0, car_base_height + 5]) // Position slightly above and front
            rotate([45, 0, 0]) // Rotate around X to create a sloping cut
            cube([20, car_width + 2, 20], center = true); // Make it wide enough to cut across entire body width

            // Rear slope cutter
            translate([car_length/2 - 10, 0, car_base_height + 5]) // Position slightly above and rear
            rotate([-45, 0, 0]) // Rotate around X to create a sloping cut
            cube([20, car_width + 2, 20], center = true); // Make it wide enough to cut across entire body width

            // Wheel arches (front-left, front-right, rear-left, rear-right)
            for (i = [-1, 1]) { // Iterate for left (-1) and right (1) sides
                for (j = [-1, 1]) { // Iterate for front (-1) and back (1) positions
                    translate([j * (car_length/2 - wheel_offset_x), i * (car_width/2), wheel_radius])
                    rotate([90, 0, 0]) // Rotate cylinder to be horizontal (axis along X)
                    cylinder(h = car_width + 20, r = wheel_radius + 2, center = true); // Cutout slightly larger than wheel
                }
            }

            // Headlight recesses
            for (i = [-1, 1]) { // Iterate for left (-1) and right (1) headlights
                // Position the cylinder's center for the cut, then rotate it to point forward.
                translate([-car_length/2 + headlight_offset_x, i * (car_width/2 - headlight_offset_y), car_base_height + headlight_radius + 2])
                rotate([0, 90, 0]) // Rotate to make cylinder axis point forward (along X)
                cylinder(h = headlight_recess_depth + 5, r = headlight_radius + 1, center = true); // Cutout slightly larger than headlight
            }

            // Window cuts (simplified rectangular cuts for definition)
            // Windshield cut
            translate([car_length/4 + 10, 0, car_base_height + cabin_height/2 + 8])
            rotate([-15, 0, 0]) // Slant the windshield
            cube([cabin_length * 0.6, cabin_width - 2, cabin_height * 0.7], center = true);

            // Rear Window cut
            translate([car_length/4 - 10, 0, car_base_height + cabin_height/2 + 8])
            rotate([15, 0, 0]) // Slant the rear window
            cube([cabin_length * 0.6, cabin_width - 2, cabin_height * 0.7], center = true);

            // Side windows cut
            for (i = [-1, 1]) { // Iterate for left (-1) and right (1) sides
                translate([car_length/4, i * (cabin_width/2 - 2), car_base_height + cabin_height/2 + 8])
                cube([cabin_length * 0.6, 2, cabin_height * 0.7], center = true);
            }
        }
    }
}

// Combine all parts to form the complete car model
module car_model() {
    // Render the car body
    car_main_body();

    // Render the four wheels
    for (i = [-1, 1]) { // Left (-1) / Right (1)
        for (j = [-1, 1]) { // Front (-1) / Back (1)
            // Position wheels outside the car body, centered vertically with the wheel arch cutouts
            translate([j * (car_length/2 - wheel_offset_x), i * (car_width/2 + wheel_thickness/2), wheel_radius])
            rotate([90, 0, 0]) // Rotate wheel to stand upright (axis along X)
            wheel();
        }
    }

    // Render the two headlights
    for (i = [-1, 1]) { // Left (-1) / Right (1)
        // Position the headlight_part inside the recess created earlier.
        // `headlight_recess_depth` offset ensures it's placed at the back of the cut.
        translate([-car_length/2 + headlight_offset_x + headlight_recess_depth, i * (car_width/2 - headlight_offset_y), car_base_height + headlight_radius + 2])
        rotate([0, 90, 0]) // Orient headlight to point forward (along X)
        headlight_part();
    }
}

// Render the entire car model
car_model();