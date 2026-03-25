#!/usr/bin/env node

/**
 * Convert glTF 2.0 model to VRM format
 * Adds VRM extensions and metadata to existing glTF files
 */

const fs = require('fs');
const path = require('path');

const SOURCE_DIR = '/Users/ghost/Desktop/aiterminal/public/models/himemori_luna';
const OUTPUT_FILE = '/Users/ghost/Desktop/aiterminal/public/models/himemori_luna.vrm';

// Read the glTF JSON
const gltfPath = path.join(SOURCE_DIR, 'scene.gltf');
const gltf = JSON.parse(fs.readFileSync(gltfPath, 'utf-8'));

// Read binary data
const binPath = path.join(SOURCE_DIR, 'scene.bin');
const binData = fs.readFileSync(binPath);

// Add VRM extensions to glTF
gltf.asset = gltf.asset || {};
gltf.asset.version = '2.0';
gltf.asset.generator = 'aiterminal-gltf-to-vrm-converter';

// Add VRM extension to mesh (required for VRM format)
if (gltf.meshes && gltf.meshes.length > 0) {
  gltf.meshes.forEach((mesh, index) => {
    if (!mesh.extras) mesh.extras = {};
    mesh.extras.targetIndices = Array.from({ length: mesh.primitives?.length || 0 }, (_, i) => i);
  });
}

// Create minimal VRM extension
gltf.extensions = gltf.extensions || {};
gltf.extensions.VRM = {
  specVersion: '1.0',
  humanoid: {
    humanBones: [],
    // You would need to manually map bones here for full VRM support
    // Example: { boneName: 'head', node: 0, useDefaultValues: true }
  },
  firstPerson: {
    meshAnnotations: [],
    lookAtTypeName: 'bone'
  },
  blendShapeMaster: {
    blendShapeGroups: []
  },
  secondaryAnimation: {
    boneGroups: []
  },
  meta: {
    title: 'Himemori Luna',
    version: '1.0',
    author: 'Converted from glTF',
    contactInformation: '',
    reference: '',
    thumbnail: '',
    allowedUserName: 'Everyone',
    violentUsageName: 'Disallow',
    sexualUsageName: 'Disallow',
    commercialUsageName: 'Disallow',
    politicalOrReligiousUsageName: 'Disallow',
    antisocialOrHateUsageName: 'Disallow',
    creditNotation: 'Required',
    allowRedistribution: 'Disallow',
    modifyAuthor: 'Disallow',
    otherLicenseUrl: ''
  },
  expressions: []
};

// Create output glTF with embedded binary
const outputGltf = {
  ...gltf,
  buffers: gltf.buffers || [{ uri: 'scene.bin', byteLength: binData.length }],
  images: (gltf.images || []).map(img => ({
    ...img,
    uri: img.uri // Keep original texture paths
  }))
};

// Write as .vrm file (glTF JSON with VRM extension)
fs.writeFileSync(OUTPUT_FILE, JSON.stringify(outputGltf, null, 2));

// Copy binary and textures to output directory
const OUTPUT_DIR = '/Users/ghost/Desktop/aiterminal/public/models';
fs.copyFileSync(binPath, path.join(OUTPUT_DIR, 'scene.bin'));

// Copy textures directory if it exists
const texturesSource = path.join(SOURCE_DIR, 'textures');
if (fs.existsSync(texturesSource)) {
  const texturesDest = path.join(OUTPUT_DIR, 'textures');
  if (!fs.existsSync(texturesDest)) {
    fs.mkdirSync(texturesDest, { recursive: true });
  }
  const textureFiles = fs.readdirSync(texturesSource);
  textureFiles.forEach(file => {
    fs.copyFileSync(path.join(texturesSource, file), path.join(texturesDest, file));
  });
}

console.log(`✅ Converted to VRM: ${OUTPUT_FILE}`);
console.log(`⚠️  Note: This is a basic conversion. For full VRM features, use UniVRM or VRoid Studio.`);
console.log(`📝 The model may need bone mapping and expression setup for complete VRM support.`);
