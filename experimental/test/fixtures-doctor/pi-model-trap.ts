export default function (pi: any) {
  pi.on('before_provider_request', () => { throw new Error('model probe loaded an excluded extension'); });
}
