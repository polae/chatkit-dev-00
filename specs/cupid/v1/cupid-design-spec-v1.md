Currently, in:

`apps/cupid/`

We are using a single mortal, match and compatibility in this folder:

`apps/cupid/backend/app/data`

I would like to be able to use a mortal, and then select from three matches, for this we will need a start scrren that diplays before the chatkit window loads (or an overlay) and this match must be selected before beginngin the game.

When the user presses play on this screen, the appropriate mortal match and comptibilty must be passed to the workflow, game, state vars as we already implemnt them ...

I will plave the data here:

`apps/cupid/backend/app/data/today`

You will see that there is ONE mortal in:
`apps/cupid/backend/app/data/today/mortal/`

and three matches:

`apps/cupid/backend/app/data/today/matches/`

And their compatibillty charts.
`apps/cupid/backend/app/data/today/compatibility/`

WE have a chatkit expreince that begins with the play screen, but i would like to add a a page overlay or a new page (BEFORE we get to the chatkit expreince that allows a user to see todays mortal (a single card) and then select from three MATHCES, (three smaller cards). When the player selects a match, we show the comoatibily score much like we do in the Comptibility Dashboard. `apps/cupid/backend/app/widgets/CompatibilityAnalysis.widget`

WE should have a screeen that shows the Mortal at the top with three choices, and then space for the comaptibility dash (or the dash), and a PLay button. These elements shoudl mirror the profile widgets (two sizes: one big for mortal, three smaller cards for the match selection), the compatibily card should mirror the Compatibilty widget we use in cupid.

When the comptibiliy display is loaded, we should also activate (a deactivated) button ath the bottom that says 'Play'

When the user presses play, we need to pass these into the state variables (and I blieve the thread metadata) that will be used in the game instrutcions as {{state.mortal}}, {{state.match}} {{state.compatibilty}}

into state (as we do in out current version -- now we just have one each).

Can you plan this out.
