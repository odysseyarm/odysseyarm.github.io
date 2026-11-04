interface ImportMetaEnv {
	/** Set only on preview builds by .github/workflows/site.yml. */
	readonly PUBLIC_PREVIEW_BRANCH?: string;
	readonly PUBLIC_PREVIEW_SAVED_AT?: string;
	readonly PUBLIC_PREVIEW_COMMIT?: string;
}
