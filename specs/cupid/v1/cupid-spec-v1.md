I'd like to make some simplifying changes to the workflow of the Cupid app.

you can see our An original workflow in the screenshot here.

`specs/cupid/v1/cupid5-workflow.png`

WE wnt to move it to the new, simpified workflow here:

`specs/cupid/v1/cupid6-workflow.png`

We want to know that this works, so we do not want to mess anything up. We love this code, but we want to remove.

EvaluateScneScore,
GameDashboard
CupidGame

futhermore,

we want ot move hte HasEnded agnet -> If/else-> set ste || Display Choices AFTER StartGameCupid

So ew will be deleting some agents and rewiring some of the workflow as above please study the screenshots above as they contina the old and new and it shoudl be failry clear what we're doing ...

To fiingh this wee we add a DsiplayCOntine card agent with the instrcionts:

<new display continue card  instructions>
Please simply output the Continue Card Widget with the message, "Ok, our story has ended. Would you like to see your evaluation?  I have notes."
</new display continue card  instructions>

And a final End agent with the instructions:

<end instructions>
The game has ended. Please thank Cupid for playing, and advise the Cupid to start over with a new story ... but this is the end.  That's to only way to do it. 
</end instructions>

Can you first fully plan this out? WE nee to be very careful and detailed with our plan.
