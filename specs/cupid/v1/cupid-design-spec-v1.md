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

We have a chatkit expreince that begins with the play screen. I would like to change that (but we are not able to simply change the config there).

but i would like to start the app with a new page sequence at the beginning (BEFORE we get to the chatkit expreince) This will allow a player user Cupid to see todays mortal (a single card) and then select from three MATCHES, (three smaller cards). When the player selects a match, we show the comoatibily score much like we do in the Comptibility Dashboard

Please examine this HTML MOCKUP we made. It is three pages in this direcotry:

`/Users/johnsteven/GITHUB/CHATKIT/chatkit-dev-00/specs/cupid/v1/mockups/mockup-v3`

Please follow this as a tempalte, but we will implement it with the ssame react stack that we use in the app.

When the user presses play, we need to pass these into the state variables (and I blieve the thread metadata) that will be used in the game instrutcions as {{state.mortal}}, {{state.match}} {{state.compatibilty}} into state (as we do in out current version -- now we just have one each).

Can you plan this out?
