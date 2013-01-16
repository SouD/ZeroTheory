#ZeroTheory
ZeroTheory is an javascript app made for Warlock players wishing to test different stats and speccs for their characters.
It is made to replicate the calculations performed by a stock Mangos Zero Server.

##Downloading
To clone ZeroTheory use the following command: git clone git://github.com/SouD/ZeroTheory.git
or download repo as .zip

##Installing
Unzip files if you downloaded the .zip archive.
Open the file "index.html" with your browser of choice. That's it!

##Browsers:
To use ZeroTheory, I recommend that you use one of the following browsers.

IE 10.0 +
Firefox 15.0 +
Chrome 22.0 +
Safari 5.1 +
Opera 12.1 +

##Future
1. Test cases!
2. Convert codebase to Java.
3. Raid ISB uptime. Either I switch to a multi-threaded language, or come up with a way that works in Javascript.
4. Raid buffs / Raid Curses. This would allow for a more accurate result.
5. Stat weightings. I have a method in place, but the calculations are probably off. If I can come up with a good way I will implement it.
6. Mana draining. Currently all calculations are done without considering mana costs. Suffice it to say that your actual dps is probably lower than the one shown due to Life Tap/mana issues.
7. Altering target stats. Things like adding different values of resistance to the target. Should be easy enough.
8. More speccs, rotations? I don't know. Maybe...
9. Stamina does nothing, not sure what I want to do with it either.

##Q and A:

**Q:** Why is there only 3 options for speccs?

**A:** Those are the 3 versions I considered while coding. If you have a viable specc for me to add which is not based on bugs (Read: Searing Pain based speccs), then I might add it.

**Q:** Why is the difference between the speccs so low/high?

**A:** Thats just the way it is. There might be something wrong with the code, but there most likely isn't. Also note that SM/Ruin does not take into account Amplify Curse nor Improved Curse of Agony.

**Q:** Why does the results vary so much sometimes?

**A:** Because the program, like Mangos Zero, uses random rolls to determine the outcome of certain things. It is after all, a simulation, and not just a calculation based on average values like Elitistjerks for example.
