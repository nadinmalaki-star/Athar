"""
VERA Clinic — Gate G1: Spatial Blockout ("Master Architectural Blockout")

Scope, per the client's own Creative Production Blueprint (final page,
"First task file to create the scene"): build ONLY a graybox architectural
blockout at realistic human/room scale, with the three specified cameras,
and export clay-material still frames + the master .blend + a top-view
plan. Explicitly NOT final materials/lookdev, NOT animation, NOT the web
hero — those are later gates (G2+), pending review of this blockout.

Three connected zones along +X, per the blueprint's "Scene Master" plan:
  A — Arrival/Threshold (glass entry, lit corridor)
  B — Reception/Consultation (open room, desk, seating)
  C — Examination (treatment chair, equipment tray)
Ceiling height 2.8m (within the 2.7-3.1m spec range). All geometry is
graybox (no final materials) in a single neutral clay shader, so the
composition/scale/lighting can be judged on form alone.

Run: blender -b --python build_g1_blockout.py
"""
import bpy, math, os
from mathutils import Euler, Vector

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
STILLS = os.path.join(ROOT, "renders", "stills")
os.makedirs(STILLS, exist_ok=True)

for o in list(bpy.data.objects):
    bpy.data.objects.remove(o, do_unlink=True)
for coll in (bpy.data.materials, bpy.data.lights, bpy.data.cameras):
    for b in list(coll):
        if b.users == 0:
            coll.remove(b)

scene = bpy.context.scene
CEIL_H = 2.8

# ------------------------------------------------------------- clay material
clay = bpy.data.materials.new("ClayGray")
clay.use_nodes = True
bsdf = clay.node_tree.nodes["Principled BSDF"]
bsdf.inputs["Base Color"].default_value = (0.62, 0.62, 0.60, 1)
bsdf.inputs["Roughness"].default_value = 0.55
bsdf.inputs["Specular IOR Level"].default_value = 0.3

glass_clay = bpy.data.materials.new("ClayGlassHint")
glass_clay.use_nodes = True
gb = glass_clay.node_tree.nodes["Principled BSDF"]
gb.inputs["Base Color"].default_value = (0.74, 0.78, 0.8, 1)
gb.inputs["Roughness"].default_value = 0.08
gb.inputs["Specular IOR Level"].default_value = 0.6


def box(name, size, loc, rot=(0, 0, 0), mat=clay, bevel=0.0):
    bpy.ops.mesh.primitive_cube_add(size=1.0)
    o = bpy.context.object
    o.name = name
    # primitive_cube_add(size=1.0) already creates a full 1.0-unit cube
    # (vertices at +/-0.5), so scale == desired size directly here.
    o.scale = (size[0], size[1], size[2])
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    o.rotation_euler = Euler([math.radians(a) for a in rot], 'XYZ')
    o.location = loc
    if bevel:
        bv = o.modifiers.new("bevel", type='BEVEL')
        bv.width = bevel
        bv.segments = 2
    o.data.materials.append(mat)
    bpy.context.view_layer.objects.active = o
    o.select_set(True)
    bpy.ops.object.shade_smooth()
    o.select_set(False)
    return o


# ------------------------------------------------------------------ floor --
box("Floor", (13.0, 5.4, 0.1), (5.5, 0, -0.05))

# ------------------------------------------------------------- back wall ---
box("BackWall", (13.0, 0.12, CEIL_H), (5.5, 2.3, CEIL_H / 2.0))
box("FrontWall_A", (2.0, 0.12, CEIL_H), (-0.6, -2.3, CEIL_H / 2.0))  # short stub left of entry
box("FrontWall_B", (6.6, 0.12, CEIL_H), (5.5, -2.3, CEIL_H / 2.0))   # long front wall, B+C

# entry glass door frame (zone A, opening at x ~ -1.6..0.1)
box("EntryFrame_L", (0.08, 0.12, CEIL_H * 0.78), (-1.7, -2.3, CEIL_H * 0.39))
box("EntryFrame_R", (0.08, 0.12, CEIL_H * 0.78), (0.1, -2.3, CEIL_H * 0.39))
box("EntryLintel", (1.9, 0.12, 0.12), (-0.8, -2.3, CEIL_H * 0.78 + 0.06))
box("EntryGlass", (1.7, 0.03, CEIL_H * 0.74), (-0.8, -2.28, CEIL_H * 0.37), mat=glass_clay)

# end wall (far end past exam room)
box("EndWall", (0.12, 4.6, CEIL_H), (12.0, 0, CEIL_H / 2.0))

# partition between Arrival (A) and Reception (B), with a corridor opening
box("Partition_AB_top", (0.12, 4.6, CEIL_H - 2.1), (2.2, 0, CEIL_H - (CEIL_H - 2.1) / 2.0))
box("Partition_AB_low_1", (0.12, 1.3, 2.1), (2.2, -1.95, 1.05))
box("Partition_AB_low_2", (0.12, 1.3, 2.1), (2.2, 1.95, 1.05))

# partition between Reception (B) and Examination (C), with a doorway
box("Partition_BC_top", (0.12, 4.6, CEIL_H - 2.1), (8.6, 0, CEIL_H - (CEIL_H - 2.1) / 2.0))
box("Partition_BC_side1", (0.12, 1.8, 2.1), (8.6, -1.6, 1.05))
box("Partition_BC_side2", (0.12, 1.8, 2.1), (8.6, 1.6, 1.05))

# ---------------------------------------------------- zone A: corridor cue --
box("CorridorLight_1", (0.5, 0.12, 0.08), (-0.4, 0, CEIL_H - 0.1))
box("CorridorLight_2", (0.5, 0.12, 0.08), (1.2, 0, CEIL_H - 0.1))

# --------------------------------------------------- zone B: reception desk --
desk = box("ReceptionDesk", (1.9, 0.65, 1.05), (4.6, 1.3, 0.525), bevel=0.02)
box("DeskMonitor", (0.45, 0.04, 0.3), (4.6, 1.0, 1.25), bevel=0.01)

for i, (dx, dy) in enumerate([(-0.65, -1.0), (0, -1.0), (0.65, -1.0)]):
    box("SeatBack_%d" % i, (0.5, 0.08, 0.75), (4.1 + dx, dy + 0.5, 0.52), rot=(-12, 0, 0), bevel=0.02)
    box("SeatSeat_%d" % i, (0.5, 0.5, 0.08), (4.1 + dx, dy, 0.42), bevel=0.02)
    box("SeatLeg_%d" % i, (0.45, 0.45, 0.42), (4.1 + dx, dy, 0.21))

box("Planter", (0.4, 0.4, 0.55), (6.4, -1.7, 0.275), bevel=0.03)

# --------------------------------------------------- zone C: treatment chair --
# graybox approximation of a reclined dental chair: pedestal base, seat,
# angled backrest, headrest — dimension-checked against real chair
# proportions (overall reclined length ~1.9m, headrest height ~0.95m).
cx, cy = 9.6, 0.0
box("ChairBase", (0.5, 0.5, 0.42), (cx, cy, 0.21), bevel=0.03)
box("ChairColumn", (0.26, 0.26, 0.18), (cx, cy, 0.5), bevel=0.02)
box("ChairSeat", (0.58, 0.55, 0.12), (cx, cy - 0.05, 0.62), bevel=0.03)
box("ChairBack", (0.58, 0.85, 0.12), (cx - 0.55, cy - 0.05, 0.88), rot=(0, -22, 0), bevel=0.03)
box("ChairHead", (0.4, 0.32, 0.1), (cx - 1.05, cy - 0.05, 0.98), rot=(0, -22, 0), bevel=0.03)
box("ChairArm_L", (0.42, 0.1, 0.07), (cx - 0.1, cy - 0.33, 0.78), bevel=0.02)
box("ChairArm_R", (0.42, 0.1, 0.07), (cx - 0.1, cy + 0.33, 0.78), bevel=0.02)

box("DentalLight_Arm", (0.06, 0.9, 0.06), (cx - 0.3, cy + 0.9, CEIL_H - 0.4), rot=(0, 0, 25))
box("DentalLight_Head", (0.32, 0.32, 0.1), (cx - 0.55, cy + 1.25, CEIL_H - 0.5), bevel=0.03)

# equipment tray / cabinet
box("EquipTray", (0.5, 0.4, 0.9), (cx + 0.7, cy + 0.9, 0.45), bevel=0.02)
box("EquipCabinet", (0.9, 0.4, 1.9), (10.9, -1.5, 0.95), bevel=0.02)

# ------------------------------------------------------------- camera aims --
def empty(name, loc):
    e = bpy.data.objects.new(name, None)
    e.empty_display_size = 0.15
    e.location = loc
    bpy.context.collection.objects.link(e)
    return e


look_entry = empty("EMPTY_LOOK_ENTRY", (3.1, 0.1, 1.35))
look_chair = empty("EMPTY_LOOK_CHAIR", (cx - 0.1, cy, 0.78))
look_tray = empty("EMPTY_LOOK_TRAY", (cx + 0.7, cy + 0.9, 0.7))


def add_camera(name, loc, target_obj, lens):
    cd = bpy.data.cameras.new(name)
    cd.lens = lens
    cam = bpy.data.objects.new(name, cd)
    cam.location = loc
    bpy.context.collection.objects.link(cam)
    con = cam.constraints.new('TRACK_TO')
    con.target = target_obj
    con.track_axis = 'TRACK_NEGATIVE_Z'
    con.up_axis = 'UP_Y'
    return cam


EYE_H = 1.55
cam1 = add_camera("CAM_01_THRESHOLD", (-1.3, 0.05, EYE_H), look_entry, 35)
cam2 = add_camera("CAM_02_RECEPTION", (3.0, -1.55, EYE_H), desk, 50)
cam3 = add_camera("CAM_03_CONSULT", (8.05, -1.6, EYE_H - 0.1), look_chair, 50)

cam_top_data = bpy.data.cameras.new("CAM_TOP_PLAN")
cam_top_data.type = 'ORTHO'
cam_top_data.ortho_scale = 13.5
cam_top = bpy.data.objects.new("CAM_TOP_PLAN", cam_top_data)
cam_top.location = (5.5, 0, 12.0)
cam_top.rotation_euler = Euler((0, 0, 0), 'XYZ')  # looking straight down -Z by default orientation below
bpy.context.collection.objects.link(cam_top)
cam_top.rotation_euler = Euler((0, 0, -math.radians(90)), 'XYZ')
# point straight down
cam_top.rotation_euler = Euler((0, 0, 0), 'XYZ')
con = cam_top.constraints.new('TRACK_TO')
look_down = empty("EMPTY_LOOK_DOWN", (5.5, 0, 0))
con.target = look_down
con.track_axis = 'TRACK_NEGATIVE_Z'
con.up_axis = 'UP_Y'

# -------------------------------------------------------------------- rig --
key_data = bpy.data.lights.new("KeyDaylight", type='AREA')
key_data.energy = 2600
key_data.size = 4.0
key = bpy.data.objects.new("KeyDaylight", key_data)
key.location = (3.5, -2.0, CEIL_H + 2.0)
key.rotation_euler = Euler((math.radians(35), 0, math.radians(-20)), 'XYZ')
bpy.context.collection.objects.link(key)

fill_data = bpy.data.lights.new("FillSoft", type='AREA')
fill_data.energy = 900
fill_data.size = 5.0
fill = bpy.data.objects.new("FillSoft", fill_data)
fill.location = (8.0, 2.2, CEIL_H + 1.5)
fill.rotation_euler = Euler((math.radians(-40), 0, math.radians(20)), 'XYZ')
bpy.context.collection.objects.link(fill)

entry_light_data = bpy.data.lights.new("EntryDaylight", type='AREA')
entry_light_data.energy = 1400
entry_light_data.size = 1.6
entry_light = bpy.data.objects.new("EntryDaylight", entry_light_data)
entry_light.location = (-1.9, -1.0, 2.0)
entry_light.rotation_euler = Euler((math.radians(60), 0, math.radians(55)), 'XYZ')
bpy.context.collection.objects.link(entry_light)

world = bpy.data.worlds.new("w")
scene.world = world
world.use_nodes = True
world.node_tree.nodes["Background"].inputs["Color"].default_value = (0.78, 0.8, 0.82, 1)
world.node_tree.nodes["Background"].inputs["Strength"].default_value = 0.35

# ---------------------------------------------------------- render setup --
scene.render.engine = 'CYCLES'
scene.cycles.device = 'CPU'
try:
    scene.cycles.denoiser = 'OPENIMAGEDENOISE'
    scene.cycles.use_denoising = True
except TypeError:
    scene.cycles.use_denoising = False
scene.cycles.samples = 160
scene.render.resolution_x = 1920
scene.render.resolution_y = 1080
scene.view_settings.view_transform = 'AgX' if 'AgX' in [t.name for t in bpy.types.ColorManagedViewSettings.bl_rna.properties['view_transform'].enum_items] else 'Filmic'
scene.view_settings.look = 'None'
scene.view_settings.exposure = 0.15

cams = [cam1, cam2, cam3, cam_top]
for cam in cams:
    scene.camera = cam
    scene.render.filepath = os.path.join(STILLS, cam.name + ".png")
    bpy.ops.render.render(write_still=True)
    print("RENDERED", cam.name)

bpy.ops.wm.save_as_mainfile(filepath=os.path.join(HERE, "VERA_MASTER_SCENE.blend"))
print("DONE")
