/**
 * @param id id number of tweet (last part of url)
 * @param user username of the account who posted the tweet
 * @param text the text of the tweet
 * @param threadID id of the first tweet in the thread this tweet is in
 */
export interface Tweet {
    id: string;
    user: string;
    text: string;
    media?: TweetMedia[];
    urls?: TweetURLs[];
    quote?: Quote;
    isThread?: boolean;
    threadID?: string;
}
/**
 * @param shortenedURL the twitter shortened url
 * @param fullURL the original image url
 * @param type photo or video
 */
export interface TweetMedia {
    shortenedImgURL: string
    fullImgURL: string
    type: string
    videoURL?: string
}
/**
 * @param shortenedURL the twitter shortened url
 * @param fullURL the original url
 */
export interface TweetURLs {
    shortenedURL: string
    fullURL: string
}
/**
 * @param url the url of the quoted tweet
 */
export interface Quote extends Tweet {
    url?: any;
}