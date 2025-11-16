( async () => {
    const liveHotSeatEvents = async (e) => {
        console.log('liveHotSeatEvents', e);
        switch (e.event) {
            case 'SIGNED_IN_WITH_EMAIL':
            case 'SIGNED_IN_WITH_CURRENT_SESSION':
                await afterSignedIn();
                break;
            case 'READY':
                break;       
            default:
                break;
        }
    };
    LiveHotSeat.subscribe(liveHotSeatEvents);

    const addEventListenerOnce = (element, eventType, handler) => {
        if (element && !element.hasAttribute('data-event-initialized')) {
            element.addEventListener(eventType, handler, true);
            element.setAttribute('data-event-initialized', 'true');
        }
    };

    async function afterSignedIn(){
        gsap.set('#loading-dialog', { display: 'none' });
        document.getElementById('sign-in-flexbox').style.display = 'none';
        document.getElementById('heading-image-grid').style.display = 'block';
        document.querySelector('.image-grid').style.display = 'block';
    }

    const handleSignIn = async (e) => {
        e.preventDefault();
        gsap.set('#sign-in-flexbox', { display: 'none' });
        gsap.set('#loading-dialog', { display: 'flex' });
        try {
            // Supabase Authentication
            const email = document.getElementById('signin-email').value;
            const password = document.getElementById('signin-password').value;
            await LiveHotSeat.loginWithEmail(email, password);
            await afterSignedIn();               
        } catch (error) {
            gsap.set('#loading-dialog', { display: 'none' });
            gsap.set('#sign-in-flexbox', { display: 'flex' });
            throw new Error(error);
        }
    };

    const signInForm = document.getElementById('form-signin-form');
    addEventListenerOnce(signInForm, 'submit', handleSignIn);

    const imageGrid = document.querySelector('.image-grid');

    // Delegate the click event for ALL current or future .hover-btn elements
    imageGrid.addEventListener('mouseup', async (e) => {
        const button = e.target.closest('.hover-btn');
        if (!button) return; // Click didn't occur on a hover button

        const parent = button.closest('.image-item');
        if (!parent) return;

        const img = parent.querySelector('img');
        if (!img) return;

        const liveAudienceUserId = img.id;
        console.log('Clicked hover button for:', { liveAudienceUserId });
        await LiveHotSeat.offerLiveHotSeat(liveAudienceUserId);
    });

    const closeLiveHotSeatBtn = document.getElementById('close-live-hot-seat-button');    
    closeLiveHotSeatBtn.addEventListener('mouseup', async ()=> await LiveHotSeat.stopLiveHotSeat());

  })();