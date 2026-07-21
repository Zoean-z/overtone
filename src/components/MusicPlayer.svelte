<script lang="ts">
import Icon from "@iconify/svelte";
import { onMount } from "svelte";

type Track = {
	title: string;
	src: string;
	cover: string;
};

export let tracks: Track[] = [];

let audio: HTMLAudioElement;
let currentIndex = 0;
let isPlaying = false;
let hasError = false;
let currentTime = 0;
let duration = 0;
let sliderValue = 0;
let pendingSeek: number | null = null;
let isSeeking = false;
let mobileMenuOpen = false;

$: currentTrack = tracks[currentIndex] || {
	title: "暂无音乐",
	src: "",
	cover: "/brand/avatar.png",
};

function loadTrack(index: number, play = false) {
	if (!audio || tracks.length === 0) return;

	currentIndex = (index + tracks.length) % tracks.length;
	hasError = false;
	currentTime = 0;
	duration = 0;
	sliderValue = 0;
	pendingSeek = null;
	audio.src = encodeURI(tracks[currentIndex].src);
	audio.load();

	if (play) {
		audio.play().catch(() => {
			hasError = true;
			isPlaying = false;
		});
	}
}

function togglePlayback() {
	if (!audio || tracks.length === 0) return;

	if (audio.paused) {
		audio.play().catch(() => {
			hasError = true;
			isPlaying = false;
		});
	} else {
		audio.pause();
	}
}

function previousTrack() {
	loadTrack(currentIndex - 1, isPlaying);
}

function nextTrack() {
	loadTrack(currentIndex + 1, true);
}

function updateProgress() {
	duration = Number.isFinite(audio.duration) ? audio.duration : 0;

	if (pendingSeek !== null && duration > 0) {
		const nextTime = Math.min(pendingSeek, duration);
		pendingSeek = null;
		setAudioTime(nextTime);
		currentTime = nextTime;
		sliderValue = nextTime;
		return;
	}

	if (!isSeeking) {
		currentTime = audio.currentTime;
		sliderValue = currentTime;
	}
}

function setAudioTime(nextTime: number) {
	try {
		audio.currentTime = nextTime;
	} catch {
		pendingSeek = nextTime;
	}
}

function seek(event: Event) {
	if (!audio) return;

	const nextTime = Number((event.currentTarget as HTMLInputElement).value);
	if (!Number.isFinite(nextTime)) return;

	isSeeking = true;
	sliderValue = nextTime;
	currentTime = nextTime;

	if (duration > 0) {
		setAudioTime(Math.min(nextTime, duration));
	} else {
		pendingSeek = nextTime;
	}
}

function finishSeek(event: Event) {
	seek(event);
	isSeeking = false;
	updateProgress();
}

function formatTime(seconds: number) {
	if (!Number.isFinite(seconds)) return "0:00";
	const minutes = Math.floor(seconds / 60);
	const remainingSeconds = Math.floor(seconds % 60)
		.toString()
		.padStart(2, "0");
	return `${minutes}:${remainingSeconds}`;
}

onMount(() => {
	audio = new Audio();
	audio.preload = "metadata";
	audio.volume = 0.35;
	audio.addEventListener("play", () => {
		isPlaying = true;
	});
	audio.addEventListener("pause", () => {
		isPlaying = false;
	});
	audio.addEventListener("timeupdate", updateProgress);
	audio.addEventListener("loadedmetadata", updateProgress);
	audio.addEventListener("ended", nextTrack);
	audio.addEventListener("error", () => {
		hasError = true;
		isPlaying = false;
	});

	const menuPanel = document.getElementById("nav-menu-panel");
	const syncMobileMenuState = () => {
		mobileMenuOpen = !menuPanel?.classList.contains("float-panel-closed");
	};
	const menuObserver = menuPanel
		? new MutationObserver(syncMobileMenuState)
		: undefined;

	syncMobileMenuState();
	menuObserver?.observe(menuPanel, {
		attributes: true,
		attributeFilter: ["class"],
	});
	loadTrack(0);

	return () => {
		menuObserver?.disconnect();
		audio.pause();
		audio.remove();
	};
});
</script>

<aside
	id="music-player"
	class="music-player card-base"
	class:error={hasError}
	class:mobile-menu-open={mobileMenuOpen}
	aria-label="音乐播放器"
	title={hasError ? "音频加载失败，请检查文件路径" : currentTrack.title}
>
	<div class="music-cover-wrap">
		<img class="music-cover" src={currentTrack.cover} alt={`${currentTrack.title} 封面`} />
		<div class:playing={isPlaying} class="music-cover-glow"></div>
	</div>

	<div class="music-content">
		<div class="music-kicker">NOW PLAYING</div>
		<button class="music-title" type="button" aria-label={`切换音乐，当前为 ${currentTrack.title}`} onclick={nextTrack}>
			{currentTrack.title}
		</button>

		<div class="music-progress-row">
			<span>{formatTime(currentTime)}</span>
			<input
				aria-label="播放进度"
				class="music-progress"
				type="range"
				min="0"
				max={duration || 1}
				value={sliderValue}
				oninput={seek}
				onchange={finishSeek}
				onpointerdown={() => (isSeeking = true)}
			/>
			<span>{formatTime(duration)}</span>
		</div>

		<div class="music-controls">
			<button type="button" aria-label="上一首" onclick={previousTrack}>
				<Icon icon="material-symbols:skip-previous-rounded" />
			</button>
			<button class="music-play" type="button" aria-label={isPlaying ? "暂停音乐" : "播放音乐"} onclick={togglePlayback}>
				<Icon icon={isPlaying ? "material-symbols:pause-rounded" : "material-symbols:play-arrow-rounded"} />
			</button>
			<button type="button" aria-label="下一首" onclick={nextTrack}>
				<Icon icon="material-symbols:skip-next-rounded" />
			</button>
		</div>
	</div>
</aside>

<style>
	.music-player {
		position: fixed;
		top: 0;
		right: 1rem;
		z-index: 60;
		display: grid;
		grid-template-columns: 4.5rem minmax(0, 1fr);
		gap: 0.75rem;
		width: 20rem;
		padding: 0.65rem;
		border-radius: 0 0 var(--radius-large) var(--radius-large);
		box-shadow: 0 1rem 2.5rem color-mix(in oklab, black 18%, transparent);
		color: var(--btn-content);
		transition: border-color 180ms ease, box-shadow 180ms ease, opacity 300ms ease, transform 300ms ease;
	}

	.music-player.navbar-hidden {
		pointer-events: none;
		opacity: 0;
		transform: translateY(-110%);
	}

	.music-player:hover {
		border-color: color-mix(in oklab, var(--primary) 32%, transparent);
		box-shadow: 0 1.2rem 3rem color-mix(in oklab, black 25%, transparent);
	}

	.music-player.error {
		border-color: color-mix(in oklab, var(--primary) 45%, transparent);
	}

	.music-cover-wrap {
		position: relative;
		width: 4.5rem;
		height: 4.5rem;
		overflow: hidden;
		border-radius: 0.8rem;
		background: var(--btn-regular-bg);
	}

	.music-cover {
		width: 100%;
		height: 100%;
		object-fit: cover;
	}

	.music-cover-glow {
		position: absolute;
		inset: 0;
		background: linear-gradient(135deg, transparent 35%, color-mix(in oklab, var(--primary) 45%, transparent));
		opacity: 0.35;
		transition: opacity 180ms ease;
	}

	.music-cover-glow.playing {
		opacity: 0.72;
		animation: music-pulse 2.4s ease-in-out infinite;
	}

	.music-content {
		min-width: 0;
		padding: 0.1rem 0.1rem 0.05rem 0;
	}

	.music-kicker {
		margin-bottom: 0.1rem;
		font-size: 0.6rem;
		font-weight: 700;
		letter-spacing: 0.18em;
		opacity: 0.5;
	}

	.music-title {
		display: block;
		width: 100%;
		overflow: hidden;
		font-size: 0.86rem;
		font-weight: 700;
		text-align: left;
		text-overflow: ellipsis;
		white-space: nowrap;
		color: var(--btn-content);
	}

	.music-title:hover {
		color: var(--primary);
	}

	.music-progress-row {
		display: flex;
		align-items: center;
		gap: 0.3rem;
		margin-top: 0.35rem;
		font-size: 0.58rem;
		opacity: 0.55;
	}

	.music-progress {
		min-width: 0;
		width: 100%;
		height: 0.2rem;
		accent-color: var(--primary);
		cursor: pointer;
	}

	.music-controls {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.45rem;
		margin-top: 0.2rem;
	}

	.music-controls button {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 1.5rem;
		height: 1.5rem;
		border-radius: 9999px;
		font-size: 1.05rem;
		transition: background 180ms ease, color 180ms ease, transform 180ms ease;
	}

	.music-controls button:hover {
		background: color-mix(in oklab, var(--primary) 15%, transparent);
		color: var(--primary);
	}

	.music-controls button:active {
		transform: scale(0.88);
	}

	.music-controls .music-play {
		width: 2rem;
		height: 2rem;
		background: var(--primary);
		color: var(--card-bg);
	}

	.music-controls .music-play:hover {
		background: var(--primary);
		color: var(--card-bg);
		filter: brightness(1.1);
	}

	@keyframes music-pulse {
		0%,
		100% {
			transform: scale(1);
		}
		50% {
			transform: scale(1.08);
		}
	}

	@media (max-width: 767px) {
		.music-player {
			top: 4.5rem;
			right: 0.75rem;
			width: min(20rem, calc(100vw - 1.5rem));
		}

		/* The navigation drawer needs the entire upper-right area on phones. */
		.music-player.mobile-menu-open {
			pointer-events: none;
			opacity: 0;
			transform: translateY(-1rem);
		}
	}
</style>
