# VRM Models

## Current Models

✅ **Three VRoid Studio samples installed:**
- `AvatarSample_A.vrm` (14MB) - Assigned to MEI (Dev intern)
- `AvatarSample_B.vrm` (15MB) - Assigned to SORA (Research intern)
- `AvatarSample_C.vrm` (13MB) - Assigned to HANA (Content intern)

These are official VRoid sample models with proper VRM extensions, bone mappings, and expression support.

## What is VRM?

VRM is a file format for 3D humanoid avatars based on glTF 2.0. It includes:
- **Bone structure** (humanoid skeleton for animations)
- **Facial expressions** (preset expressions like happy, angry, sad)
- **Spring bones** (physics-based hair/clothing movement)
- **Metadata** (author, license, usage terms)

## Getting VRM Models

### Option 1: VRoid Studio (Recommended - Free)

1. Download [VRoid Studio](https://vroid.com/en/studio) (Windows/Mac)
2. Create your anime avatar
3. Export as VRM file
4. Place in `public/models/your-avatar.vrm`

### Option 2: Download VRM Models

Free VRM models available at:
- [VRM.dev](https://vrm.dev) - Official samples
- [Booth](https://booth.pm) - Search for "VRM" (free/paid)
- [GitHub](https://github.com) - Search "VRM model"

### Option 3: Convert Existing Models

**Note:** Simple glTF→VRM conversion often fails because VRM requires:
- Proper humanoid bone mapping (hips, spine, head, arms, legs)
- Expression blend shapes
- VRM metadata extensions

Use official tools:
- [UniVRM](https://github.com/vrm-c/UniVRM) - Unity package for VRM creation
- [VRM Converter](https://vrm.dev/docs/how-to-make-vrm/) - Official converter

## Adding Your VRM

1. Place VRM file in `public/models/your-model.vrm`
2. Update `src/renderer/vrm-models.ts`:
   ```typescript
   mei: {
     id: 'mei',
     name: 'mei',
     displayName: 'YOUR NAME',
     url: './models/your-model.vrm',  // Relative path
     thumbnail: '',
     description: 'Your description',
     personality: 'Your personality',
     specialties: ['Your', 'Skills'],
     color: '#3b82f6',
     emoji: '👩‍💻'
   }
   ```

## Supported File Types

- **.vrm** - VRM format (primary)
- `.gltf` / `.glb` - glTF 2.0 (needs VRM extensions)

Not supported:
- `.fbx` - Autodesk FBX
- `.obj` - Wavefront OBJ
- `.dae` - COLLADA

## Troubleshooting

**Avatar stuck on "Loading..."**
- VRM file might be missing humanoid bone mappings
- Try a different VRM file
- Check browser console (DevTools) for errors

**Avatar shows emoji placeholder**
- VRM loading failed (this is normal for invalid VRM files)
- The app gracefully falls back to emoji mode

**Want to use regular glTF files?**
- Would require code changes to remove VRM-specific features
- Would lose expressions and humanoid animations

## Resources

- [VRM Specification](https://vrm.dev/docs/)
- [three-vrm Documentation](https://github.com/pixiv/three-vrm)
- [VRM Community Discord](https://discord.gg/vrm)
