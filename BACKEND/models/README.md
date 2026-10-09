# TensorFlow.js recognition models

Demo mode is enabled in `app.js`, so the site works without trained model files.

To enable model inference, set `USE_DEMO_MODE = false` at the top of `app.js` and add your own TensorFlow.js LayersModel exports:

- `models/asl/model.json` and its weight shards, expecting a `[1, 30, 63]` input.
- `models/isl/model.json` and its weight shards, expecting a `[1, 30, 126]` input.
- Update each `labels.json` so its order exactly matches the output classes of that model.

Each hand is translated into 21 x/y/z landmarks, centred on the wrist, and scaled by the largest wrist-relative point distance. The sliding window contains 30 frames. This contract must match your training pipeline; a model with a different landmark order, hand ordering, normalisation or output class order will not be compatible.

No fake model weights are included. The browser will show a model-load notice if real mode is enabled before model files are added.
