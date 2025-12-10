Currently, in:

`apps/cupid/`

We are using a single mortal, match and compatibility in this folder:

`apps/cupid/backend/app/data`

I would like to be able to use different a mortal, and then select from three matches.

I will update this manuallly every day.

For this, please let's look in `apps/cupid/backend/app/data/today`

You will see that there is ONE mortal in:
`apps/cupid/backend/app/data/today/mortal/`

and three matches:

`apps/cupid/backend/app/data/today/matches/`

And their compatibillty charts.

WE have a chatkit expreince that begins with the play screen, but i would like to add a a page overlay or a new page (BEFORE we get to the chatkit expreince that allows a user to see todays mortal (a single card) and then select from three MATHCES, (three smaller cards). When the player selects a match, we show the comoatibily score much like we do in the Comptibility Dashboard. `apps/cupid/backend/app/widgets/CompatibilityAnalysis.widget`

These elements shoudl mirror the profile widgets (two sizes: one big for mortal, three smaller cards for the match selection), the compatibily card should mirror the Compatibilty widget we use in cupid.

When the comptibiliy display is loaded, we should also activate (a deactivated) button ath the bottom that says 'Play'

When the user presses play, we need to pass these into the state variables (and I blieve the thread metadata) that will be used in the game instrutcions as {{state.mortal}}, {{state.match}} {{state.compatibilty}}

into state (as we do in out current version -- now we just have one each).

Can you plan this out.
