(() => {
    const youHostLiveEvents = async (e) => {
        console.log('youHostLiveEvents', e);
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
    YouHostLive.subscribe(youHostLiveEvents);

    const closeWelcomeBtn = document.getElementById('close-welcome-button');
    closeWelcomeBtn.addEventListener('mouseup', function() {
        gsap.set("#welcome-dialog", { display: "none"}); 
        gsap.set("#nav-flexbox", { display: "flex", opacity: 1 });
        YouHostLive.unMute();
    });

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
    
    const openYouHostLiveBtn = document.getElementById('open-you-host-live-button');
    openYouHostLiveBtn.addEventListener('mouseup', function() {
        gsap.set("#you-host-live-dialog", { display: "flex"}); 
        gsap.set("#nav-flexbox", { display: "none" });
    });

    const agreeYouHostLiveBtn = document.getElementById('agree-you-host-live-button');    
    agreeYouHostLiveBtn.addEventListener('mouseup', function() {
        gsap.set("#nav-flexbox", { display: "none" });
        gsap.set("#you-host-live-dialog", { display: "none"});
        gsap.set("#live-audience-dialog", { display: "flex"});
    });  
    
    const closeYouHostLiveDialogBtn = document.getElementById('close-you-host-live-dialog-button');    
    closeYouHostLiveDialogBtn.addEventListener('mouseup', function() {
        gsap.set("#you-host-live-dialog", { display: "none"});
        gsap.set("#nav-flexbox", { display: "flex" });
    });  

    const closeLiveAudienceBtn = document.getElementById('sign-out-name-comment-button');    
    closeLiveAudienceBtn.addEventListener('mouseup', function() {
        gsap.set("#live-audience-dialog", { display: "none"});
        gsap.set("#nav-flexbox", { display: "flex" });
    });  
    
    const signOutCameraBtn = document.getElementById('sign-out-camera-button');    
    signOutCameraBtn.addEventListener('mouseup', async function() {
        YouHostLive.stopLiveAudience();
        gsap.set("#live-audience-camera-flexbox", { display: "none"});
        gsap.set("#nav-flexbox", { display: "flex" });
    });

    const closeYouHostLiveBtn = document.getElementById('close-you-host-live-button');    
    closeYouHostLiveBtn.addEventListener('mouseup', async function() {
        await YouHostLive.stopYouHostLive();
    });

    const acceptYouHostLiveBtn = document.getElementById('accept-you-host-live-button');    
    acceptYouHostLiveBtn.addEventListener('mouseup', async function(e) {
        gsap.set("#fullscreen-video-container", { display: "none"});
        gsap.set("#live-audience-camera-flexbox", { display: "none"});
        gsap.set("#accept-you-host-live-flexbox", { display: "none" });
        gsap.set("#close-you-host-live-flexbox", { display: "flex" });
        gsap.set("#title-flexbox", { display: "none" });
        gsap.set("#nav-flexbox", { display: "none" });
        await YouHostLive.startYouHostLive(e);
    });

    const goLiveAudienceBtn = document.getElementById('go-live-audience-button');    
    goLiveAudienceBtn.addEventListener('mouseup', async function(){
        gsap.set("#live-audience-dialog", { display: "none"});
        gsap.set("#nav-flexbox", { display: "none" });
        gsap.set('#loading-dialog', { display: 'flex' });

        try {
            await YouHostLive.startLiveAudience();

            gsap.set('#loading-dialog', { display: 'none' });
            gsap.set("#live-audience-camera-flexbox", { display: "flex"});
        } catch (error) {
            YouHostLive.stopLiveAudience();
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
                repeat: 3,
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
                onComplete: () => {
                    YouHostLive.renderLiveStreamOnClient();
                }
        });

        

    }
})();