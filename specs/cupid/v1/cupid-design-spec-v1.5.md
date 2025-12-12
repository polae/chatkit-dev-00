Currently, in:

`apps/cupid/`

WE just made the changes we speced in: specs/cupid/v1/cupid-design-spec-v1.md

THe app shoudl be able to be compfortabley played on mobile. We want to take a look at the Welcome sequence the begins before the chatkit conversation ...

We're now seeing on the first screen:

- welcome + the mortal card
- match options + compatibilty
- mortal + match + compatibility.

In order to improvie this for mobile i woul dlike to.

Add a welceom screen with says the information in:

apps/cupid/frontend/src/lib/config.ts

use the content for the welcome screen.

The new sequence will be

- welcome screen (Cupid title, version, and description + play button)
- mortal (Meet today's mortal message + profile card)
- match (asll three matches - butt follow important instrcutions below)
- confirm (the same scrren with mortal anbd match mini cards + compatibilty + PLAY)

The match scrren shoudl list the three potential matches. but when the match is clicked the compatibilty shoudl appear in the same place as the match selected (in shoudl replece it in place, and activate the button to select. when tapped again, it shoudl go back to the match profile card and deactivet the button, you see?)

Let's plean these changes and get to it!
