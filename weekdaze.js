(() => {
    const liveHotSeatEvents = async (e) => {
        console.log('liveHotSeatEvents', e);
        switch (e.event) {
            case 'SIGNED_IN_WITH_EMAIL':
            case 'SIGNED_IN_WITH_CURRENT_SESSION':
                break;
            case 'READY':
                await renderWindow();
                break;
            default:
                break;
        }
    };
    LiveHotSeat.subscribe(liveHotSeatEvents);

    const openMissionBtn = document.getElementById('open-mission-button');
    openMissionBtn.addEventListener('mouseup', function() {
        gsap.set("#mission-dialog", { display: "flex"}); 
        gsap.set("#nav-flexbox", { display: "none" });
    });

    const missionCloseBtn = document.getElementById('close-mission-button');
    missionCloseBtn.addEventListener('mouseup', function() {
        gsap.set("#mission-dialog", { display: "none"});
        gsap.set("#nav-flexbox", { display: "flex" });
    });  
    
    const openLiveHotSeatBtn = document.getElementById('open-live-hot-seat-button');
    openLiveHotSeatBtn.addEventListener('mouseup', function() {
        gsap.set("#live-hot-seat-dialog", { display: "flex"}); 
        gsap.set("#nav-flexbox", { display: "none" });
    });

    const agreeLiveHotSeatBtn = document.getElementById('agree-live-hot-seat-button');    
    agreeLiveHotSeatBtn.addEventListener('mouseup', function() {
        gsap.set("#nav-flexbox", { display: "none" });
        gsap.set("#live-hot-seat-dialog", { display: "none"});
        gsap.set("#live-audience-dialog", { display: "flex"});
    });  
    
    const closeLiveHotSeatDialogBtn = document.getElementById('close-live-hot-seat-dialog-button');    
    closeLiveHotSeatDialogBtn.addEventListener('mouseup', function() {
        gsap.set("#live-hot-seat-dialog", { display: "none"});
        gsap.set("#nav-flexbox", { display: "flex" });
    });  

    const closeLiveAudienceBtn = document.getElementById('sign-out-name-comment-button');    
    closeLiveAudienceBtn.addEventListener('mouseup', function() {
        gsap.set("#live-audience-dialog", { display: "none"});
        gsap.set("#nav-flexbox", { display: "flex" });
    });  
    
    const signOutCameraBtn = document.getElementById('sign-out-camera-button');    
    signOutCameraBtn.addEventListener('mouseup', async function() {
        LiveHotSeat.stopLiveAudience();
        gsap.set("#live-audience-camera-flexbox", { display: "none"});
        gsap.set("#nav-flexbox", { display: "flex" });
    });

    const closeLiveHotSeatBtn = document.getElementById('close-live-hot-seat-button');    
    closeLiveHotSeatBtn.addEventListener('mouseup', async function() {
        await LiveHotSeat.stopLiveHotSeat();
    });

    const acceptLiveHotSeatBtn = document.getElementById('accept-live-hot-seat-button');    
    acceptLiveHotSeatBtn.addEventListener('mouseup', async function() {
        gsap.set("#fullscreen-video-container", { display: "none"});
        gsap.set("#live-audience-camera-flexbox", { display: "none"});
        gsap.set("#accept-live-hot-seat-flexbox", { display: "none" });
        gsap.set("#close-live-hot-seat-flexbox", { display: "flex" });
        gsap.set("#title-flexbox", { display: "none" });
        gsap.set("#nav-flexbox", { display: "none" });
        await LiveHotSeat.startLiveHotSeat();
    });

    const goLiveAudienceBtn = document.getElementById('go-live-audience-button');    
    goLiveAudienceBtn.addEventListener('mouseup', async function(){
        gsap.set("#live-audience-dialog", { display: "none"});
        gsap.set("#nav-flexbox", { display: "none" });
        gsap.set('#loading-dialog', { display: 'flex' });

        try {
            await LiveHotSeat.startLiveAudience();

            gsap.set('#loading-dialog', { display: 'none' });
            gsap.set("#live-audience-camera-flexbox", { display: "flex"});
        } catch (error) {
            LiveHotSeat.stopLiveAudience();
            gsap.set("#live-audience-dialog", { display: "flex"});
            gsap.set("#nav-flexbox", { display: "flex" });
            gsap.set('#loading-dialog', { display: 'none' });
            // throw new Error(error);
        }
    }); 

    async function renderWindow(){
        // ***************************************************************************
        // Page animations   
        // ***************************************************************************
        console.log('Starting Animations.');

        const b1 = "linear-gradient(217deg, rgba(255,255,255,.9), rgba(255,255,255,0) 70.71%),  linear-gradient(127deg, rgba(255,255,255,.9), rgba(0,255,0,0) 70.71%), linear-gradient(336deg, rgba(0,0,255,.9), rgba(0,0,255,0) 70.71%)";
        const b2 = "linear-gradient(17deg, rgba(255,0,0,.7), rgba(255,0,0,0) 70.71%), linear-gradient(200deg, rgba(0, 255, 0, .9), rgba(0,255,0,.2) 70.71%),  linear-gradient(336deg, rgba(0,0,255,.8), rgba(0,0,255,0.1) 70.71%)";

        gsap.registerPlugin(SplitText);
        gsap.fromTo("div[data-animate='gradient']", {opacity: 0}, {ease: "none", duration: .5, opacity: 1});
        gsap.fromTo("div[data-animate='gradient']", {background: b1}, {ease: "none", duration: 5, background: b2, repeat: 1, yoyo: true});
        
        let split = SplitText.create("span[data-animate='staggered-text']", { type: "chars" }); 
        gsap.fromTo(split.chars, {
                opacity: 0,
                filter: "blur(40px)",
                y: "random(-150, 150)",
        }, {
                opacity: 1,
                filter: "blur(0px)",
                y: 0,
                duration: 2.4,
                stagger:{
                    each: .3,
                    from: "random",
                    ease: "random(power2, inOut)" // distributes the start times
                },
                ease: "power2.inOut",
                repeat: 5,
                // repeatDelay: 1,
                yoyo: true
        });
        gsap.set("#title-flexbox", { opacity: 1 });
        
        //  rgba(14, 16, 15, 1)
        gsap.fromTo("[data-animate='vimeo-fade-in']", {
                opacity: 0
        }, {
                delay: 3.6,
                opacity: 1,
                duration: 3,
                ease: "power2.inOut",
        });

        gsap.set("#nav-flexbox", { display: "flex", opacity: 1 });

    }
})();