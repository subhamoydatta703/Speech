# Third-party components

- Electron: MIT; Chromium and bundled dependencies have their own notices included in the runtime distribution.
- React and React DOM: MIT. https://github.com/facebook/react/blob/main/LICENSE
- whisper.cpp v1.8.4 and GGML: MIT. The engine license is downloaded from the pinned release source and included beside the engine.
- Whisper Base model: OpenAI Whisper, MIT. Model weights are downloaded separately from the public ggerganov/whisper.cpp repository at revision 5359861c739e955e79d9a303bcbc70fb988958b1. https://github.com/openai/whisper/blob/main/LICENSE
- Microsoft Visual C++ x64 Redistributable: Microsoft license terms, presented by its own installer. The original signed Microsoft installer is bundled unchanged as an optional prerequisite, never installed silently by Speech. https://learn.microsoft.com/en-us/cpp/windows/redistributing-visual-cpp-files

The project owner determines Speech's own distribution license. These notices do not change the licenses of third-party components.
