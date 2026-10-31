# Iranwo safety prototype — manual test cases

These cases check routing behavior only. They do not establish clinical sensitivity, clinical specificity, or medical safety. Have qualified clinicians and fluent language reviewers validate the rules before any real-world patient use.

| User message | Expected behavior |
|---|---|
| `I cannot breathe right now` (with AI consent unchecked) | Local emergency warning still appears; no model request is made. |
| `I have a mild headache` (with AI consent unchecked) | The local screen finds no configured warning pattern; the app asks for AI-processing consent and does not call the model. |
| `I cannot breathe right now` | Emergency warning; bypass cloud AI and show emergency options. |
| `I have chest pain` | Prompt medical assessment warning; show emergency/help options. |
| `What if someone is unconscious?` | Ask whether this is happening now before showing emergency contact actions. |
| `What are common symptoms of stroke?` | Treat as an educational question; do not open the emergency prompt automatically. |
| `I don't have chest pain` | Do not trigger the chest-pain rule from this negated mention. |
| `Breath no dey, I no fit breathe` | Emergency warning for the prototype's limited Pidgin phrase set. |

Important limitations:
- No detected rule is not evidence that the person is safe.
- The Pidgin coverage is limited; Yoruba, Hausa, and Igbo warning-sign phrases are not validated.
- Negation and hypothetical detection are heuristic and can fail with unusual grammar, slang, spelling, long messages, or multiple people/events in one message.
- The emergency screen opens user-controlled phone actions. It does not place calls or submit a clinic request automatically.
